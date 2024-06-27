import "dotenv/config";
import { EventEmitter } from "eventemitter3";
import { ErrorLogger } from './errorLogger';
import Conversation from './conversation';
import { VM, VMScript } from 'vm2'; // Import VMScript
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

    // Initialize logging
    setLogLevel('info'); // Set default log level
    toggleService('Assistant', true); // Enable logging for Assistant service
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

  getToolSource(toolModule: any) {
    return toolModule.toString();
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
        let tool: any = this.tools[toolName];
        tool = await this.loadTool(toolName);
        if (!tool) {
          throw new Error(`Tool '${toolName}' not found.`);
        }

        const scriptFunction = new Function('params', 'api', `
          return async function() {
            return (async function() {
              return (${tool.source})(params, api);
            })();
          };
        `);
        
        return await scriptFunction(params, this);

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
    if (this.toolRegistry.tools[name]) {
      return this.toolRegistry.tools[name];
    }
    const toolSource = await this.toolRegistry.loadTool(name);
    if (!toolSource) {
      return;
    }
    const tool = new Tool(this.toolRegistry, name, toolSource.version, toolSource.description, toolSource.source, toolSource.tags, toolSource.schema);
    this.toolRegistry.tools[name] = tool;
    return tool;
  }

  async updateTool(name: string, source: string): Promise<boolean> {
    return this.toolRegistry.updateTool(name, source);
  }

  async rollbackTool(name: string, version: string): Promise<boolean> {
    return this.toolRegistry.rollbackTool(name, version);
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

    const similarMemories = await this.memoryStore.findSimilarMemories(input, SIMILARITY_THRESHOLD);

    if (similarMemories.length > 0) {
      const adjustedMemories = similarMemories.map(memory => ({
        ...memory,
        adjustedConfidence: this.confidenceCalculator.calculateRetrievalConfidence(memory.confidence, memory.similarity)
      }));
      const bestMemory = this.selectBestMemory(adjustedMemories);
      
      if (bestMemory.adjustedConfidence > CONFIDENCE_THRESHOLD) {
        const adaptedResponse = await this.adaptMemoryToInput(bestMemory, input, model);
        await this.updateMemoryConfidence(bestMemory);
        return { success: true, data: adaptedResponse };
      }
    }

    try {
      if (model !== 'claude' && model !== 'gemini') {
        throw new Error("Invalid model specified. Choose either 'claude' or 'gemini'.");
      }

      const convo = new Conversation(model);
      const jsonPrompt = (compactRepresentation) => `Transform the given task into a sequence of subtasks, each with a JavaScript script that uses the provided tools to achieve the subtask objective.

Available Tools:

${compactRepresentation}

Additional tools can be explored using 'list_all_tools', 'get_tool_details', and 'load_tool'.

Process:

1. Analyze the task and identify necessary steps
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
\`\`\`

Examples:

\`\`\`json
[
  {
    "task": "get_last_100_lines:Get the last 100 lines of each log file in the /var/log directory",
    "script": "const files = await tools.busybox2({ operations: [{ operation: 'read', path: '/var/log' }] });\nconst lastLines = await tools.callLLMs({ prompts: files.split('\\n'), system_prompt: 'Write a shell script that prints the last 100 lines of the given file: \${file}', resultVar: 'last100Lines' });\ntaskResults.last100Lines_results = last100Lines;\nreturn last100Lines;",
    "chat": "This subtask first lists all files in the \`/var/log\` directory. Then, it uses the \`callLLMs\` tool to generate a shell script for each file, which will extract the last 100 lines of that file. The results are stored in the \`last100Lines\` variable.",
    "resultVar": "last100Lines" 
  },
  {
    "task": "extract_errors:Extract timestamps and error messages from the retrieved log lines",
    "script": "const errors = [];\nfor (const line of taskResults.last100Lines_results) {\n  if (line.includes('ERROR')) {\n    const timestampRegex = /\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}/;\n    const timestampMatch = line.match(timestampRegex);\n    const timestamp = timestampMatch ? timestampMatch[1] : 'N/A';\n    const errorMessage = line.split('ERROR')[1].trim();\n    errors.push({ timestamp, message: errorMessage });\n  }\n}\ntaskResults.errors_results = errors;\nreturn errors;",
    "chat": "This subtask iterates through the \`last100Lines\` results and extracts timestamps and error messages for lines containing 'ERROR'. The extracted information is stored in the \`errors\` variable.",
    "resultVar": "errors"
  },
  {
    "task": "save_error_report:Save the extracted errors as a JSON file",
    "script": "await tools.busybox2({ operations: [{ operation: 'write', path: 'error_report.json', data: JSON.stringify(taskResults.errors_results) }] });\nreturn 'Error report saved to error_report.json';",
    "chat": "This subtask writes the extracted errors (from the \`errors\` variable) to a JSON file named \`error_report.json\`."
  },
  {
    "task": "create_project_structure:Create the directory structure for the project",
    "script": "await tools.busybox2({ operations: [{ operation: 'mkdir', path: 'my-node-project' }] });\ntaskResults.projectPath_results = 'my-node-project';\nreturn 'Project directory created';", 
    "chat": "Creates the main project directory (\`my-node-project\`)",
    "resultVar": "projectPath"
  },
  {
    "task": "create_config_file:Create and populate the config.json file",
    "script": "const config = { welcomeMessage: 'Hello from the new Node.js project!' };\nawait tools.busybox2({ operations: [{ operation: 'write', path: \`\${taskResults.projectPath_results}/config.json\`, data: JSON.stringify(config, null, 2) }] });\nreturn 'Configuration file created';", 
    "chat": "Creates \`config.json\` within the project directory and adds a default welcome message."
  },
  {
    "task": "generate_utils_module:Create the utils.js module with a logging function",
    "script": "const utilsCode = \`const logMessage = (message) => { console.log(message); };\nmodule.exports = { logMessage };\n\`;\nawait tools.busybox2({ operations: [{ operation: 'write', path: \`\${taskResults.projectPath_results}/utils.js\`, data: utilsCode }] });\nreturn 'Utility module created';", 
    "chat": "Creates \`utils.js\` with a function to log messages to the console." 
  },
  {
    "task": "generate_index_file:Create the main index.js file with logic to load configuration and use the utils module",
    "script": "const indexCode = \`const config = require('./config.json');\nconst { logMessage } = require('./utils');\nlogMessage(config.welcomeMessage);\n\`;\nawait tools.busybox2({ operations: [{ operation: 'write', path: \`\${taskResults.projectPath_results}/index.js\`, data: indexCode }] });\nreturn 'Index file created';", 
    "chat": "Creates \`index.js\`, which loads configuration and uses the \`logMessage\` function from \`utils.js\`."
  }
]
\`\`\`


CRITICAL: Verify the JSON output for accuracy and completeness before submission. *** OUTPUT ONLY JSON ***`;

      this.toolRegistry;
      const response = await convo.chat([
        {
          role: 'system',
          content: jsonPrompt(this.toolRegistry.getCompactRepresentation())
        },
        {
          role: 'user',
          content: this.escapeTemplateLiteral(JSON.stringify({
            task: input,
          })),
        },
      ]);

      let tasks = response.content[0].text;
      // remove ```json amd ``` from the response
      tasks = tasks.replace(/```json/g, '').replace(/```/g, '');
      // remove newline characters
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

      // Store new memory
      const initialConfidence = this.confidenceCalculator.calculateInitialConfidence(1.0, JSON.stringify(tasks));
      await this.memoryStore.storeMemory(input, JSON.stringify(tasks), initialConfidence);
      
      const results: any = [];

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

        // script = await convo.chat([
        //   {
        //     role: 'system',
        //     content: `Given some Javascript code, you validate its syntax and semantics, and you output a valid version of the code with template literals properly escaped. If the code is already valid, you output the original code with template literals properly escaped. <critical>YOU DO NOT OUTPUT ANY COMMENTARY, FORMATTING, OR ANYTHING AT ALL OTHER THAN CODE.</critical>`
        //   },
        //   {
        //     role: 'user',
        //     content: script,
        //   },
        // ], {} as any, 'gemini-1.5-flash-001');
        // script = script.code;

        this.store[`${taskId}_script`] = script;
        this.emit(`${taskId}_script`, script);

        const sr = await this.callScript(script);
        task.scriptResult = sr;

        this.store[`${taskId}_result`] = sr;
        this.store[`${taskId}_results`] = sr;
        const rout = { id: taskId, task: taskName, script, result: sr };
        this.emit(`${taskId}_results`, rout);

        results.push(rout as any);
      }

      const newMemory = JSON.stringify(tasks);

      // Store new memory or update existing one
      const existingMemories = await this.memoryStore.findSimilarMemories(input, SIMILARITY_THRESHOLD);
      if (existingMemories.length > 0) {
        const existingMemory = this.selectBestMemory(existingMemories);
        const newConfidence = this.confidenceCalculator.updateConfidence(existingMemory.confidence, 1.0);
        await this.memoryStore.updateMemory(input, newMemory, newConfidence);
      } else {
        const initialConfidence = this.confidenceCalculator.calculateInitialConfidence(1.0, newMemory);
        await this.memoryStore.storeMemory(input, newMemory, initialConfidence);
      }

      if (resultVar) {
        this.store[resultVar] = results;
      }

      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error };
    }
  }

  // Update memory confidence based on successful retrieval
  private async updateMemoryConfidence(memory: Memory & { similarity: number }) {
    const newConfidence = this.confidenceCalculator.updateConfidence(memory.confidence, memory.similarity);
    await this.memoryStore.updateMemory(memory.input, memory.response, newConfidence);
  }

  async callScript(script: string, retryLimit: number = 10): Promise<any> {
    let retryCount = 0;
    let context: any;
  
    while (retryCount < retryLimit) {
      try {
        // Preserve the existing context setup
        context = {
          tools: {},
          taskResults: {},
          console: { log: console.log, error: console.error },
          require: require,
          fs: require('fs'),
          path: require('path'),
          axios: require('axios'),
          _: require('lodash'),
        };
  
        // Preserve the existing tool binding logic
        for (const toolName in this.toolRegistry.tools) {
          context.tools[toolName] = async (...args: any[]) => {
            return await this.callTool(toolName, args);
          };
          context[toolName] = context.tools[toolName]; // Allow direct tool access
        }
  
        // Preserve the existing task results binding
        for (const task in this.store) {
          context.taskResults[task] = this.store[task];
          context[task] = this.store[task]; // Allow direct task result access
        }

        // Escape the script before execution
        const escapedScript = this.escapeTemplateLiteral(script);
  
        let llmResponse = await this.conversation.chat([{
            role: 'system',
            content: `You are a NON-VERBAL, CODE-OUTPUTTING agent. You Refactor the provided script to ES5 to integrate it with the below template then output the Javascript VERBATIM with NO COMMENTS.`
        },{
            role: 'user',
            content: `with (context) {
              return (async function() {
                return (${escapedScript})({ operations }, run);
              })();
            }`
        }]);
        llmResponse = llmResponse.content[0].text;
        const scriptFunction = new Function('context', 'api', `
          return async function() {
            return (async function() {
              return (${llmResponse})(context, api);
            })();
          };
        `);

        const result = await scriptFunction(context, this);

        for (const task in context.taskResults) {
          this.store[task] = context.taskResults[task];
        }
  
        return result;
      } catch (error: any) {
        this.logError(`Error calling script: ${error}`);
  
        retryCount++;
  
        if (retryCount >= retryLimit) {
          // Preserve the existing error logging
          this.errorLogger.logError({
            error: error.message,
            stackTrace: error.stack,
            script: script,
            retryAttempts: retryCount,
            context: context
          });
          throw new Error(`Script execution failed after ${retryLimit} attempts.`);
        }
  
        // Preserve the existing error handling and LLM-based fix attempt
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
  
        // Attempt to fix the script using the language model
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
  
          // Ensure llmResponse is parsed as JSON
          if (typeof llmResponse === 'string') {
            llmResponse = JSON.parse(llmResponse);
          }
  
          const { modifiedScript, explanation } = llmResponse as any;
  
          this.logInfo(explanation);
  
          // Update the script for the next retry
          script = this.unescapeTemplateLiteral(modifiedScript);
  
        } catch (fixError) {
          // Handle errors during the script fixing process
          this.logError(`Error attempting to fix the script: ${fixError}`);
        }
  
        // Implement a retry delay if needed
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
      }
    }
  
    throw new Error("Reached end of callScript function. This should not happen.");
  }

  getSchemas() {
    return this.toolRegistry.schemas;
  }

  // Extract error line number from stack trace
  private extractErrorLine(stackTrace: string) {
    const lineRegex = /at .*? \(.*?:(\d+):\d+\)/;
    const match = stackTrace.match(lineRegex);
    return match && match[1] ? parseInt(match[1], 10) : null;
  }

  // Prompt the user for input
  async promptUser(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.logInfo(question);
      this.chatWindow = (response: string) => {
        resolve(response);
      };
    });
  }

  // Extract JSON objects from a string
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