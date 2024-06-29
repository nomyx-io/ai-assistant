import "dotenv/config";
import { EventEmitter } from "eventemitter3";
import { ErrorLogger } from './errorLogger';
import Conversation from './conversation';
import { VM } from 'vm2';
import { MemoryStore } from './memory/store';
import { ConfidenceCalculator } from './memory/confidence';
import { ChromaClient } from 'chromadb';
import fs from "fs";
import path from "path";
import { Tool } from "./tool";
import { log, setLogLevel, toggleService } from './logger';
import { createPrompts } from './prompts';
import ToolRegistry from "./toolRegistry";

interface Memory {
  input: string;
  response: string;
  confidence: number;
  adjustedConfidence?: number;
  usedTools: string[];
}

const errorLogger = new ErrorLogger('error.log');

export class Assistant extends EventEmitter {
  public memoryStore: MemoryStore;
  public confidenceCalculator: ConfidenceCalculator;
  public apiKey: string = process.env.ANTHROPIC_API_KEY || '';
  public working = false;
  public debug = false;
  public history: string[] = [];
  public savedOutput = '';
  public currentTask: string = '';

  private store: any = {};
  private prompts: any;

  private globalRetryCount: number = 0;
  private globalRetryLimit: number = 100;

  protected conversation: Conversation;
  protected errorLogger: ErrorLogger = errorLogger;

  constructor(public toolRegistry: ToolRegistry, public chromaClient: ChromaClient) {
    super();
    this.conversation = new Conversation('claude');
    this.prompts = createPrompts(this.conversation);
    this.memoryStore = new MemoryStore(chromaClient);
    this.confidenceCalculator = new ConfidenceCalculator();

    this.ensureToolsDirectory();

    setLogLevel('info');
    toggleService('Assistant', true);

    this.bindMethods();
  }

  private bindMethods() {
    this.callScript = this.callScript.bind(this);
    this.considerAddingAsTool = this.considerAddingAsTool.bind(this);
    this.executeScript = this.executeScript.bind(this);
    this.extractErrorLine = this.extractErrorLine.bind(this);
    this.extractJson = this.extractJson.bind(this);
    this.promptUser = this.promptUser.bind(this);
    this.retryOperation = this.retryOperation.bind(this);
    this.updateMemoryConfidence = this.updateMemoryConfidence.bind(this);
    this.callAgent = this.callAgent.bind(this);
    this.callTool = this.callTool.bind(this);
  }

  private ensureToolsDirectory() {
    const toolsDir = path.join(__dirname, 'tools');
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir, { recursive: true });
    }
  }

  private logMessage(level: string, message: string) {
    log(level, message, 'Assistant');
  }

  async getToolRegistryReport(): Promise<any> {
    return await this.toolRegistry.generateReport();
  }

  async improveToolManually(toolName: string, newSource: string): Promise<boolean> {
    return await this.toolRegistry.updateTool(toolName, newSource, {}, []);
  }

  getToolSource(toolName: string) {
    const tool = this.toolRegistry.tools[toolName];
    return tool ? tool.source : null;
  }

  get tools(): { [key: string]: Tool } {
    return this.toolRegistry.tools;
  }

  async pause(duration: number) {
    return await new Promise(resolve => setTimeout(resolve, duration));
  }

  private conversationBuffer: Array<{ role: string, content: string }> = [];

  private addToConversationBuffer(role: string, content: string) {
    this.conversationBuffer.push({ role, content });
    if (this.conversationBuffer.length > 50) {  // Limit buffer size
      this.conversationBuffer.shift();
    }
  }

  public getConversationRedux(): Array<{ role: string, content: string }> {
    return [...this.conversationBuffer];
  }

  private isRetryableError(error: any): boolean {
    const retryableErrorMessages = [
      'network timeout',
      'connection refused',
      'server unavailable',
    ];
    return retryableErrorMessages.some(message =>
      error.message.toLowerCase().includes(message)
    );
  }

  protected async retryOperation<T>(operation: () => Promise<T>, maxRetries: number, delay: number, toolName?: string): Promise<T> {
    let retries = 0;
    while (true) {
      try {
        this.globalRetryCount++;
        if (this.globalRetryCount > this.globalRetryLimit) {
          throw new Error("Global retry limit exceeded.");
        }
        await this.pause(1000);
        return await operation();
      } catch (error: any) {
        if (retries >= maxRetries || !this.isRetryableError(error)) {
          throw error;
        }

        retries++;
        const retryDelay = delay * Math.pow(2, retries);
        const message = toolName ? `Error calling tool '${toolName}': ${error.message}` : `Error: ${error.message}`;
        this.logMessage('warn', `${message}. Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async callTool(toolName: string, params: any) {
    this.logMessage('debug', `Calling tool: ${toolName}`);
    if (Array.isArray(params)) params = params[0];

    return this.retryOperation(async () => {
      try {
        return await this.toolRegistry.callTool(toolName, params);
      } catch (error: any) {
        if (toolName === 'ask' && error.message.includes('No response received')) {
          return "I'm sorry, but I didn't receive a response. Could you please try again?";
        } else if (toolName === 'busybox' && error.message.includes('No such file or directory')) {
          const alternativeLocation = await this.promptUser("The specified file or directory was not found. Please provide an alternative location:");
          if (alternativeLocation) {
            params.args[0] = alternativeLocation;
            return await this.callTool(toolName, params);
          }
        }
        throw error;
      }
    }, 3, 1000, toolName);
  }

  async showToolHistory(args: string[]) {
    if (args.length < 1) {
      this.logMessage('info', "Usage: .tool history <name>");
      return;
    }

    const [name] = args;

    try {
      const history = await this.toolRegistry.getToolHistory(name);
      this.logMessage('info', name);
      history.forEach((entry: any) => {
        this.logMessage('info', `  ${entry}`);
      });
    } catch (error) {
      this.logMessage('error', `Error fetching tool history: ${error.message}`);
    }
  }

  async loadTool(name: string): Promise<Tool | undefined> {
    return await this.toolRegistry.loadTool(name);
  }

  async updateTool(name: string, source: string): Promise<boolean> {
    return await this.toolRegistry.updateTool(name, source, {}, []);
  }

  async rollbackTool(name: string, version: string): Promise<boolean> {
    return await this.toolRegistry.rollbackTool(name, version);
  }

  private selectBestMemory(memories: Array<Memory & { similarity: number }>): Memory & { similarity: number } {
    return memories.reduce((best, current) =>
      (current.confidence * current.similarity > best.confidence * best.similarity) ? current : best
    );
  }

  private async adaptMemoryToInput(memory: Memory & { similarity: number }, newInput: string, model: string): Promise<string> {
    const prompt = this.prompts.adaptMemory(memory, newInput);
    const response = await this.conversation.chat([
      { role: 'system', content: prompt },
      { role: 'user', content: 'Adapt the memory to the new input.' }
    ]);

    return response.content[0].text;
  }

  async executeRegistryManagement(params: any): Promise<any> {
    return this.toolRegistry.tools['registry_management'].call(this, params);
  }

  async callAgent(input: string, model = 'claude', resultVar?: string): Promise<{ success: boolean; data?: any; error?: Error; }> {
    const CONFIDENCE_THRESHOLD = 0.8;
    const SIMILARITY_THRESHOLD = 0.9;

    try {
      this.addToConversationBuffer('user', input);
      log('info', `Received input: ${input}`, 'Assistant');

      const relevantTools = await this.toolRegistry.predictLikelyTools(input);
      const similarMemories = await this.memoryStore.findSimilarMemories(input, SIMILARITY_THRESHOLD);

      if (similarMemories.length > 0) {
        const adjustedMemories = similarMemories.map(memory => ({
          ...memory,
          adjustedConfidence: this.confidenceCalculator.calculateRetrievalConfidence(memory.confidence, memory.similarity)
        }));
        const bestMemory = this.selectBestMemory(adjustedMemories as any);

        if (bestMemory.adjustedConfidence > CONFIDENCE_THRESHOLD) {
          const adaptedResponse = await this.adaptMemoryToInput(bestMemory, input, model);
          await this.updateMemoryConfidence(bestMemory);
          this.addToConversationBuffer('assistant', JSON.stringify(adaptedResponse));
          log('info', `Using adapted memory response`, 'Assistant');
          return { success: true, data: adaptedResponse };
        }
      }

      const toolsRepresentation = this.toolRegistry.getCompactRepresentation();
      const memoriesRepresentation = this.prepareMemoriesRepresentation(similarMemories as any);
      const recentActivity = await this.summarizeRecentActivity();

      const taskDecompositionPrompt = this.prompts.taskDecomposition(input, toolsRepresentation, memoriesRepresentation, recentActivity);
      const response = await this.conversation.chat([
        { role: 'system', content: taskDecompositionPrompt },
        { role: 'user', content: input }
      ]);

      let tasks = this.extractJson(response.content[0].text);

      if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new Error('The task must be an array of subtasks. Check the format and try again.');
      }

      log('info', `Decomposed input into ${tasks.length} tasks`, 'Assistant');

      const results: any = [];
      const usedTools: Set<string> = new Set();

      this.store[input] = tasks;

      if (Array.isArray(tasks[0])) {
        tasks = tasks[0];
      }

      if (resultVar) {
        this.store[resultVar] = results;
      }

      for (const task of tasks) {
        const { task: taskName, script, chat } = task;
        const [taskId, taskDescription] = taskName.split(':');

        this.store['currentTaskId'] = taskId;
        this.emit('taskId', taskId);

        this.store[`${taskId}_task`] = task;
        this.emit(`${taskId}_task`, task);

        this.store[`${taskId}_chat`] = chat;
        this.emit(`${taskId}_chat`, chat);

        this.store[`${taskId}_script`] = script;
        this.emit(`${taskId}_script`, script);

        try {
          log('info', `Executing task: ${taskId}`, 'Assistant');
          await this.toolRegistry.addTool(taskId, script, {
            name: taskId,
            description: taskDescription || taskName,
            methodSignature: `${taskId}(params: any, api: any): Promise<any>`,
          }, ['ai-generated']);

          const result = await this.toolRegistry.callTool(taskId, {});
          task.scriptResult = result;

          const toolsUsedInScript = this.extractUsedTools(script);
          toolsUsedInScript.forEach(tool => usedTools.add(tool));

          this.store[`${taskId}_result`] = result;
          this.store[`${taskId}_results`] = result;
          const taskResult = { id: taskId, task: taskDescription || taskName, script, result: result };
          this.emit(`${taskId}_results`, taskResult);

          results.push(taskResult);
          log('info', `Task ${taskId} executed successfully`, 'Assistant');
        } catch (error) {
          log('error', `Error executing task ${taskId}: ${error.message}`, 'Assistant');
          const errorReport = this.generateErrorReport(error, script, this.prepareContext());
          const fixedScript = await this.getFixedScript(errorReport);

          try {
            log('info', `Attempting to execute fixed script for task ${taskId}`, 'Assistant');
            const result = await this.executeScript(fixedScript, this.prepareContext());
            task.scriptResult = result;

            await this.toolRegistry.updateTool(taskId, fixedScript, {
              name: taskId,
              description: taskDescription || taskName,
              methodSignature: `${taskId}(params: any, api: any): Promise<any>`,
            }, ['ai-generated', 'auto-fixed']);

            const taskResult = { id: taskId, task: taskDescription || taskName, script: fixedScript, result: result };
            this.emit(`${taskId}_results`, taskResult);
            results.push(taskResult);
            log('info', `Fixed script for task ${taskId} executed successfully`, 'Assistant');
          } catch (retryError) {
            log('error', `Failed to execute task ${taskId} after error recovery: ${retryError.message}`, 'Assistant');
            results.push({ id: taskId, task: taskDescription || taskName, error: retryError.message });
          }
        }
      }

      const newMemory = JSON.stringify(tasks);
      const initialConfidence = this.confidenceCalculator.calculateInitialConfidence(1.0, newMemory);
      await this.memoryStore.storeMemory(input, newMemory, initialConfidence);

      for (const memory of similarMemories) {
        await this.updateMemoryConfidence(memory as any);
      }

      if (resultVar) {
        this.store[resultVar] = results;
      }

      await this.optimizeScripts(tasks);

      this.addToConversationBuffer('assistant', JSON.stringify(results));
      log('info', `Agent call completed successfully`, 'Assistant');
      return { success: true, data: results };
    } catch (error: any) {
      log('error', `High-level error in callAgent: ${error.message}`, 'Assistant');
      this.addToConversationBuffer('error', error.message);
      try {
        const errorReport = this.generateErrorReport(error, input, this.prepareContext());
        const fixedInput = await this.getFixedInput(errorReport);
        log('info', `Attempting to recover with fixed input`, 'Assistant');
        return this.callAgent(fixedInput, model, resultVar);
      } catch (recoveryError) {
        log('error', `Failed to recover from high-level error: ${recoveryError.message}`, 'Assistant');
        return { success: false, error: recoveryError };
      }
    }
  }

  private async getFixedInput(errorReport: string): Promise<string> {
    log('debug', `Attempting to fix input`, 'Assistant');
    const fixPrompt = this.prompts.fixInput(errorReport);
    const llmResponse = await this.conversation.chat([
      { role: 'system', content: fixPrompt },
      { role: 'user', content: 'Provide a fixed input based on the error report.' }
    ]);
    return llmResponse.content[0].text;
  }

  private async executeScript(script: string, context: any): Promise<any> {
    log('debug', `Executing script`, 'Assistant');
    try {
      const result = await this.toolRegistry.callScript(script);
      return result;
    } catch (error) {
      const errorReport = this.generateErrorReport(error, script, context);
      const fixedScript = await this.getFixedScript(errorReport);
      return this.executeScript(fixedScript, context);
    }
  }

  private async summarizeRecentActivity(): Promise<string> {
    log('debug', `Summarizing recent activity`, 'Assistant');
    const summaryPrompt = this.prompts.summarizeConversation(this.conversationBuffer);
    const summary = await this.conversation.chat([
      { role: 'system', content: summaryPrompt },
      { role: 'user', content: 'Summarize the recent activity.' }
    ]);
    return summary.content[0].text;
  }

  private prepareMemoriesRepresentation(memories: Array<Memory & { similarity: number }>): string {
    return memories.map(memory => `
Input: ${memory.input}
Response: ${memory.response}
Tools Used: ${memory.usedTools.join(', ')}
Confidence: ${memory.confidence}
Similarity: ${memory.similarity}
`).join('\n');
  }

  private extractUsedTools(script: string): string[] {
    const toolRegex = /tools\.(\w+)/g;
    const matches = script.match(toolRegex);
    return matches ? [...new Set(matches.map(match => match.split('.')[1]))] : [];
  }

  private async updateMemoryConfidence(memory: Memory & { similarity: number }) {
    const newConfidence = this.confidenceCalculator.updateConfidence(memory.confidence, memory.similarity);
    await this.memoryStore.updateMemory(memory.input, memory.response, newConfidence);
  }

  async callScript(script: string, retryLimit: number = 10): Promise<any> {
    let retryCount = 0;

    while (retryCount < retryLimit) {
      try {
        return await this.toolRegistry.callScript(script);
      } catch (error) {
        this.logMessage('error', `Error calling script: ${error}`);

        retryCount++;

        if (retryCount >= retryLimit) {
          this.errorLogger.logError({
            error: error.message,
            stackTrace: error.stack,
            script: script,
            retryAttempts: retryCount
          });
          throw new Error(`Script execution failed after ${retryLimit} attempts.`);
        }

        const errorDescription = this.prepareErrorDescription(error, script, retryCount, retryLimit);
        this.errorLogger.logError(errorDescription);

        try {
          const fixedScript = await this.getFixedScript(errorDescription);
          script = this.unescapeTemplateLiteral(fixedScript);
        } catch (fixError) {
          this.logMessage('error', `Error attempting to fix the script: ${fixError}`);
        }

        await this.pause(1000 * retryCount);
      }
    }

    throw new Error("Reached end of callScript function. This should not happen.");
  }

  private prepareContext(): any {
    const context: any = {
      tools: {},
      taskResults: {},
      console: { log: console.log, error: console.error },
      require: require,
      fs: require('fs'),
      path: require('path'),
      axios: require('axios'),
      _: require('lodash'),
    };

    for (const toolName in this.toolRegistry.tools) {
      context.tools[toolName] = async (...args: any[]) => await this.toolRegistry.callTool(toolName, args);
      context[toolName] = context.tools[toolName];
    }

    for (const task in this.store) {
      context.taskResults[task] = this.store[task];
      context[task] = this.store[task];
    }

    return context;
  }

  private generateErrorReport(error: Error, script: string, context: any): string {
    return `
  Error: ${error.message}
  Stack Trace: ${error.stack}
  Script:
  ${script}
  Context:
  ${JSON.stringify(context, null, 2)}
  Task: ${this.currentTask}
    `;
  }

  private async considerAddingAsTool(script: string): Promise<void> {
    await this.toolRegistry.analyzeAndCreateToolFromScript(script, "Auto-generated from successful script execution");
  }

  private async optimizeScripts(tasks: any[]): Promise<void> {
    for (const task of tasks) {
      await this.toolRegistry.improveTools();
    }
  }

  getSchemas() {
    return this.toolRegistry.schemas;
  }

  private extractErrorLine(stackTrace: string) {
    const lineRegex = /at .*? \(.*?:(\d+):\d+\)/;
    const match = stackTrace.match(lineRegex);
    return match && match[1] ? parseInt(match[1], 10) : null;
  }



async promptUser(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.logMessage('info', question);
      // Implement a way to get user input here
      // For now, we'll just resolve with a placeholder
      resolve("User input placeholder");
    });
  }

  extractJson(content: string): any[] {
    const jsonObjects: any[] = [];
    let depth = 0;
    let currentJson = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (escapeNext) {
        currentJson += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        currentJson += char;
        escapeNext = true;
        continue;
      }

      if (char === '"' && !inString) {
        inString = true;
        currentJson += char;
        continue;
      }

      if (char === '"' && inString) {
        inString = false;
        currentJson += char;
        continue;
      }

      if (!inString) {
        if (char === '{' || char === '[') {
          if (depth === 0) {
            currentJson = '';
          }
          depth++;
        } else if (char === '}' || char === ']') {
          depth--;
          if (depth === 0) {
            currentJson += char;
            try {
              const parsed = JSON.parse(currentJson);
              jsonObjects.push(parsed);
            } catch (error) {
              // If parsing fails, we don't attempt to fix it
              // as it might be intentionally escaped JSON within a string
            }
            currentJson = '';
            continue;
          }
        }
      }

      currentJson += char;
    }

    return jsonObjects;
  }

  private escapeTemplateLiteral(str: string): string {
    return str;
  }

  private unescapeTemplateLiteral(str: string): string {
    return str.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
  }

  private prepareErrorDescription(error: any, script: string, retryCount: number, retryLimit: number): string {
    const errorMessage = error.message;
    const stackTrace = error.stack;
    const errorLine = this.extractErrorLine(stackTrace);

    let errDescription = `Error calling script (attempt ${retryCount}/${retryLimit}): ${errorMessage}\nScript: ${script}\nError Line: ${errorLine}\nStack Trace: ${stackTrace}\n\nAvailable Tools: ${Object.keys(this.toolRegistry.tools).join(', ')}\n\nIn context: ${Object.keys(this.prepareContext()).join(', ')}`;
    if (retryCount === Math.floor(retryLimit / 2)) {
      errDescription += `\n\n*** Halfway through the retry limit. Try something else. ***`;
    }

    return errDescription;
  }

  private async getFixedScript(errorDescription: string): Promise<string> {
    const fixPrompt = this.prompts.fixScript(errorDescription);
    const llmResponse = await this.conversation.chat([
      { role: 'system', content: fixPrompt },
      { role: 'user', content: 'Fix the script based on the error description.' }
    ]);

    const fixedScriptResponse = JSON.parse(llmResponse.content[0].text);
    this.logMessage('info', fixedScriptResponse.explanation);
    return fixedScriptResponse.modifiedScript;
  }

  private async runInSandbox(script: string, context: any): Promise<any> {
    const vm = new VM({
      timeout: 10000,
      sandbox: context
    });

    return await vm.run(script);
  }
}