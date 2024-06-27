import "dotenv/config";
import { EventEmitter } from "eventemitter3";
import { ErrorLogger } from './errorLogger';
import Conversation from './conversation';
import { VM, VMScript } from 'vm2';
import chalk from 'chalk';

import { MemoryStore } from './memory/store';
import { ConfidenceCalculator } from './memory/confidence';
import { ChromaClient } from 'chromadb';
import fs from "fs";
import path from "path";
import { Tool } from "./tool_registry";

import { log, setLogLevel, toggleService } from '../logger';

interface Memory {
  input: string;
  response: string;
  confidence: number;
  adjustedConfidence?: number;
  usedTools: string[];
}

const errorLogger = new ErrorLogger('error.log');

export default class Assistant extends EventEmitter {

  public memoryStore: MemoryStore;
  public confidenceCalculator: ConfidenceCalculator;

  public chatWindow: any;
  public apiKey: string = process.env.ANTHROPIC_API_KEY || '';
  public vscode: any;

  store: any;

  private globalRetryCount: number = 0;
  private globalRetryLimit: number = 100;

  protected conversation: Conversation;
  protected errorLogger: ErrorLogger = errorLogger;

  public working = false;
  public debug = false;
  public history: string[] = [];
  public savedOutput = '';

  constructor(public toolRegistry: any, public chromaClient: ChromaClient) {
    super();
    this.store = {};
    this.conversation = new Conversation('claude');
    this.memoryStore = new MemoryStore(chromaClient);
    this.confidenceCalculator = new ConfidenceCalculator();

    this.ensureToolsDirectory();

    setLogLevel('info');
    toggleService('Assistant', true);
  }

  private ensureToolsDirectory() {
    const toolsDir = path.join(__dirname, 'tools');
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir, { recursive: true });
    }
  }

  private logError(message: string) {
    log('error', message, 'Assistant');
  }

  private logInfo(message: string) {
    log('info', message, 'Assistant');
  }

  private logWarn(message: string) {
    log('warn', message, 'Assistant');
  }

  private logDebug(message: string) {
    log('debug', message, 'Assistant');
  }

  async getToolRegistryReport(): Promise<string> {
    return await this.toolRegistry.generateReport();
  }

  async improveToolManually(toolName: string, newSource: string): Promise<boolean> {
    return await this.toolRegistry.updateTool(toolName, newSource);
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
        this.logWarn(`${message}. Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async callTool(toolName: string, params: any) {
    this.logDebug(`Calling tool: ${toolName}`);
    if(Array.isArray(params)) params = params[0];

    return this.retryOperation(async () => {
      try {
        const tool = await this.toolRegistry.loadTool(toolName);
        if (!tool) {
          throw new Error(`Tool '${toolName}' not found.`);
        }

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
      this.logInfo("Usage: .tool history <name>");
      return;
    }

    const [name] = args;

    try {
      const history = await this.toolRegistry.getToolHistory(name);
      this.logInfo(name);
      history.forEach((entry: any) => {
        this.logInfo(`  ${entry}`);
      });
    } catch (error) {
      this.logError(`Error fetching tool history: ${error.message}`);
    }
  }

  async loadTool(name: string): Promise<Tool|undefined> {
    return await this.toolRegistry.loadTool(name);
  }

  async updateTool(name: string, source: string): Promise<boolean> {
    return await this.toolRegistry.updateTool(name, source);
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
    const convo = new Conversation(model);
    const prompt = `Given a new input and a similar previous experience, please adapt the previous response to fit the new input:

Previous Input: ${memory.input}
Previous Response: ${memory.response}
Tools Used: ${memory.usedTools.join(', ')}
New Input: ${newInput}

Adapted Response:`;

    const response = await convo.chat([
      { role: 'system', content: 'You are an AI assistant tasked with adapting previous responses to new inputs.' },
      { role: 'user', content: prompt }
    ]);

    return response.content[0].text;
  }

  async executeRegistryManagement(params: any): Promise<any> {
    return this.toolRegistry.tools['registry_management'].execute(this, params);
  }

  async callAgent(input: string, model = 'claude', resultVar?: string): Promise<{ success: boolean; data?: any; error?: Error; }> {
    const CONFIDENCE_THRESHOLD = 0.8;
    const SIMILARITY_THRESHOLD = 0.9;
  
    try {
      // Preprocessing step: Select relevant tools and retrieve similar memories
      const relevantTools = await this.toolRegistry.predictLikelyTools(input);
      const similarMemories = await this.memoryStore.findSimilarMemories(input, SIMILARITY_THRESHOLD);
  
      // Check if we can use an existing memory
      if (similarMemories.length > 0) {
        const adjustedMemories = similarMemories.map(memory => ({
          ...memory,
          adjustedConfidence: this.confidenceCalculator.calculateRetrievalConfidence(memory.confidence, memory.similarity)
        }));
        const bestMemory = this.selectBestMemory(adjustedMemories as any);
        
        if (bestMemory.adjustedConfidence > CONFIDENCE_THRESHOLD) {
          const adaptedResponse = await this.adaptMemoryToInput(bestMemory, input, model);
          await this.updateMemoryConfidence(bestMemory);
          return { success: true, data: adaptedResponse };
        }
      }
  
      // Prepare the prompt with the selected tools and similar memories
      const toolsRepresentation = this.toolRegistry.getCompactRepresentation(relevantTools);
      const memoriesRepresentation = this.prepareMemoriesRepresentation(similarMemories as any);
  
      const jsonPrompt = (compactRepresentation, memoriesRepresentation) => `Transform the given task into a sequence of subtasks, each with a JavaScript script that uses the provided tools to achieve the subtask objective.
  
  Available Tools:
  
  ${compactRepresentation}
  
  Similar Past Experiences:
  
  ${memoriesRepresentation}
  
  Additional tools can be explored using 'list_all_tools', 'get_tool_details', and 'load_tool'.
  
  Process:
  
  1. Analyze the task and identify necessary steps, considering similar past experiences
  2. Decompose into subtasks with clear objectives and input/output
  3. For each subtask, write a JavaScript script using the tools
    a. Access previous subtask results with taskResults.<taskName>_results: \`const lastResult = taskResults.firstTask_results; ...\`
    b. Store subtask results in a variable for future use: \`const result = { key: 'value' }; taskResults.subtask_results = result; ...\`
    b. End the script with a return statement for the subtask deliverable: \`return result;\`
  4. Test each script and verify the output
  5. Provide a concise explanation of the subtask's purpose and approach
  
  Data Management:
  
  - Store subtask results in resultVar (JSON/array format): \`taskResults.subtask_results = result;\`
  Access previous subtask data with taskResults.<resultVar>: \`const lastResult = taskResults.subtask_results; ...\`
  Include only resultVar instructions in responses, not the actual data.
  
  Output Format:
  \`\`\`json
  [
    {
    "task": "<taskName>:<description>",
    "script": "<JavaScript script>",
    "chat": "<subtask explanation>",
    "resultVar": "<optional result variable>"
    },
    // ... additional subtasks
  ]
  \`\`\``;
  
      const convo = new Conversation(model);
      const response = await convo.chat([
        {
          role: 'system',
          content: jsonPrompt(toolsRepresentation, memoriesRepresentation)
        },
        {
          role: 'user',
          content: this.escapeTemplateLiteral(JSON.stringify({
            task: input,
          })),
        },
      ]);
  
      let tasks = response.content[0].text;
      tasks = tasks.replace(/```json/g, '').replace(/```/g, '');
      tasks = tasks.replace(/\n/g, '');
      
  
      let message = '';
      try {
        tasks = this.extractJson(tasks);
      } catch (error: any) {
        message = error.message;
      }
      if (!Array.isArray(tasks) || tasks.length === 0) {
        this.logError(message);
        throw new Error('The task must be an array of subtasks. Check the format and try again. RETURN ONLY JSON RESPONSES' + message);
      }
  
      const results: any = [];
      const usedTools: Set<string> = new Set();
  
      this.store[input] = tasks;
  
      if(Array.isArray(tasks) && Array.isArray(tasks[0])) {
        tasks = tasks[0];
      }
  
      if (resultVar) {
        this.store[resultVar] = results;
      }
  
      for (const task of tasks) {
        let { task: taskName, script, chat } = task;
        const splitTask = taskName.split(':');
        let taskId = taskName;
        if (splitTask.length > 1) {
          taskId = splitTask[0];
          taskName = splitTask[1];
        }
        this.store['currentTaskId'] = taskId;
        this.emit('taskId', taskId);
  
        this.store[`${taskId}_task`] = task;
        this.emit(`${taskId}_task`, task);
  
        this.store[`${taskId}_chat`] = chat;
        this.emit(`${taskId}_chat`, chat);
  
        this.store[`${taskId}_script`] = script;
        this.emit(`${taskId}_script`, script);
  
        const sr = await this.callScript(script);
        task.scriptResult = sr;
  
        // Track used tools
        const toolsUsedInScript = this.extractUsedTools(script);
        toolsUsedInScript.forEach(tool => usedTools.add(tool));
  
        this.store[`${taskId}_result`] = sr;
        this.store[`${taskId}_results`] = sr;
        const rout = { id: taskId, task: taskName, script, result: sr };
        this.emit(`${taskId}_results`, rout);
  
        results.push(rout as any);
      }
  
      const newMemory = JSON.stringify(tasks);
  
      // Store the new memory with used tools
      const initialConfidence = this.confidenceCalculator.calculateInitialConfidence(1.0, newMemory);
      await this.memoryStore.storeMemory(input, newMemory, initialConfidence);
  
      // Update confidence for similar memories
      for (const memory of similarMemories) {
        await this.updateMemoryConfidence(memory as any);
      }
  
      if (resultVar) {
        this.store[resultVar] = results;
      }
  
      // After processing all tasks, consider optimizing scripts
      this.optimizeScripts(tasks);
  
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error };
    }
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
        // Check if this script already exists as a tool
        const existingTool = await this.toolRegistry.getTool(script);
        if (existingTool) {
          await this.toolRegistry.callTool(existingTool.name, {});
          }
  
          // If not, execute the script as before
          const context = this.prepareContext();
          const result = await this.executeScript(script, context);
  
          // After successful execution, consider adding this script as a new tool
          this.considerAddingAsTool(script);
  
          return result;
        } catch (error: any) {
          this.logError(`Error calling script: ${error}`);
  
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
  
          const errorMessage = error.message;
          const stackTrace: any = error.stack;
          const errorLine = this.extractErrorLine(stackTrace);
  
          this.errorLogger.logError({
            error: errorMessage,
            stackTrace: stackTrace,
            script: script,
            errorLine: errorLine,
            retryAttempts: retryCount
          });
  
          try {
            let llmResponse = await this.callTool('callLLM', {
              system_prompt: 'Analyze the provided script, script error, and context, generate a fixed version of the script, and output it and an explanation of your work *in a JSON object*. Output the modified script and explanation *in JSON format* { modifiedScript, explanation }. ***OUTPUT RAW JSON ONLY***.',
              prompt: JSON.stringify({
                error: errorMessage,
                stackTrace: stackTrace,
                script: this.escapeTemplateLiteral(script),
                errorLine: errorLine,
              })
            });
  
            if (typeof llmResponse === 'string') {
              llmResponse = JSON.parse(llmResponse);
            }
  
            const { modifiedScript, explanation } = llmResponse as any;
  
            this.logInfo(explanation);
  
            script = this.unescapeTemplateLiteral(modifiedScript);
  
          } catch (fixError) {
            this.logError(`Error attempting to fix the script: ${fixError}`);
          }
  
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
  
      throw new Error("Reached end of callScript function. This should not happen.");
    }
  
    private prepareContext(): any {
      const context = {
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
        context.tools[toolName] = async (...args: any[]) => {
          return await this.toolRegistry.callTool(toolName, args);
        };
        context[toolName] = context.tools[toolName];
      }
  
      for (const task in this.store) {
        context.taskResults[task] = this.store[task];
        context[task] = this.store[task];
      }
  
      return context;
    }
  
    private async executeScript(script: string, context: any): Promise<any> {
      const escapedScript = this.escapeTemplateLiteral(script);
      const llmResponse = await this.conversation.chat([
        { role: 'system', content: `You are a NON-VERBAL, CODE-OUTPUTTING agent. Refactor the provided script to ES5 to integrate it with the below template then output the Javascript VERBATIM with NO COMMENTS.` },
        { role: 'user', content: `with (context) { return (async function() { return (${escapedScript})({ operations }, run); })(); }` }
      ]);
      const scriptFunction = new Function('context', 'api', `
        return async function() {
          return (async function() {
            return (${llmResponse.content[0].text})(context, api);
          })();
        };
      `);
  
      const result = await scriptFunction(context, this);
  
      // Update the store with new task results
      for (const task in context.taskResults) {
        this.store[task] = context.taskResults[task];
      }
  
      return result;
    }
  
    private async considerAddingAsTool(script: string): Promise<void> {
      // This method would analyze the script and potentially add it as a new tool
      // You can implement the logic based on your specific requirements
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
        this.logInfo(question);
        this.chatWindow = (response: string) => {
          resolve(response);
        };
      });
    }
  
    extractJson(content: string) {
      return extractJson(content);
    }
  
    private escapeTemplateLiteral(str: string): string {
      return str;
    }
  
    private unescapeTemplateLiteral(str: string): string {
      return str.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
    }
  }
  
  export function extractJson(content: string): any[] {
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