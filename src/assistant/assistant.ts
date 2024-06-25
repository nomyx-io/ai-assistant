import "dotenv/config";
import { EventEmitter } from "eventemitter3";
import { ErrorLogger } from './errorLogger';
import ToolRegistry, { IToolRegistry } from './tool_registry';
import Conversation from './conversation';
import { VM, VMScript } from 'vm2'; // Import VMScript
import chalk from 'chalk';
import { Tool } from './types'; // Import Tool interface

import { MemoryStore } from './memory/store';
import { ConfidenceCalculator } from './memory/confidence';
import { ChromaClient } from 'chromadb';
import fs from "fs";
import path from "path";


interface Memory {
  input: string;
  response: string;
  confidence: number;
  adjustedConfidence?: number;
}

const errorLogger = new ErrorLogger('error.log');

export default class Assistant extends EventEmitter {

  protected memoryStore: MemoryStore;
  protected confidenceCalculator: ConfidenceCalculator;

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

  constructor(public toolRegistry: IToolRegistry, public chromaClient: ChromaClient) {
    super();
    this.store = {};
    this.conversation = new Conversation('claude'); // Default to 'claude'
    this.memoryStore = new MemoryStore(chromaClient);
    this.confidenceCalculator = new ConfidenceCalculator();

    this.ensureToolsDirectory();
  }

  private ensureToolsDirectory() {
    const toolsDir = path.join(__dirname, 'tools');
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir, { recursive: true });
    }
  }

  // Get source code text from the required module
  getToolSource(toolModule: any) {
    return toolModule.toString();
  }

  get tools(): { [key: string]: Tool } {
    return this.toolRegistry.tools;
  }

  async pause(duration: number) {
    return await new Promise(resolve => setTimeout(resolve, duration));
  }

  // Function to determine if an error is retryable
  private isRetryableError(error: any): boolean {
    const retryableErrorMessages = [
      'network timeout',
      'connection refused',
      'server unavailable',
      // Add more retryable error messages here
    ];
    return retryableErrorMessages.some(message =>
      error.message.toLowerCase().includes(message)
    );
  }

  // Retry operation with exponential backoff
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
        console.warn(`${message}. Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }


  // Call a tool with error handling and fallback strategies
  async callTool(toolName: string, params: any) {

    const validationResult = this.toolRegistry.validateToolInput(toolName, params);
    if (!validationResult.valid) {
      throw new Error(`Invalid input for tool '${toolName}': ${JSON.stringify(validationResult.errors)}`);
    }

    return this.retryOperation(async () => {
      try {
        this.toolRegistry;
        const tool = this.toolRegistry.tools[toolName]; // Access tool directly
        if (!tool) {
          throw new Error(`Tool '${toolName}' not found.`);
        }
        return await tool.execute(params, this as any); // Use standardized execute function
      } catch (error: any) {
        // Handle fallback strategies based on tool and error
        if (toolName === 'ask' && error.message.includes('No response received')) {
          return "I'm sorry, but I didn't receive a response. Could you please try again?";
        } else if (toolName === 'busybox' && error.message.includes('No such file or directory')) {
          const alternativeLocation = await this.promptUser("The specified file or directory was not found. Please provide an alternative location:");
          if (alternativeLocation) {
            params.args[0] = alternativeLocation;
            return await this.callTool(toolName, params);
          }
        }
        // Add more fallback strategies for other tools as needed
        throw error;
      }
    }, 3, 1000, toolName);
  }

  async showToolHistory(args: string[]) {
    if (args.length < 1) {
      console.log("Usage: .tool history <name>");
      return;
    }

    const [name] = args;

    try {
      const history = await this.toolRegistry.getToolHistory(name);
      console.log(chalk.bold(`History for tool '${name}':`));
      history.forEach(entry => {
        console.log(`  ${entry}`);
      });
    } catch (error) {
      console.error(chalk.red(`Error fetching tool history: ${error.message}`));
    }
  }


  async loadTool(name: string): Promise<boolean> {
    const toolSource = await this.toolRegistry.loadTool(name);
    if (!toolSource) {
      return false;
    }
    // Assuming tools are loaded and added to this.toolRegistry.tools
    return true;
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

  // Call the language model agent
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
    "script": "const files = await tools.busybox({ command: 'ls', args: ['/var/log'] });\nconst lastLines = await tools.callLLMs({ prompts: files.split('\\n'), system_prompt: 'Write a shell script that prints the last 100 lines of the given file: \${file}', resultVar: 'last100Lines' });\ntaskResults.last100Lines_results = last100Lines;\nreturn last100Lines;",
    "chat": "This subtask first lists all files in the \`/var/log\` directory. Then, it uses the \`callLLMs\` tool to generate a shell script for each file, which will extract the last 100 lines of that file. The results are stored in the \`last100Lines\` variable.",
    "resultVar": "last100Lines" 
  },
  {
    "task": "extract_errors:Extract timestamps and error messages from the retrieved log lines",
    "script": "const errors = [];\nfor (const line of taskResults.last100Lines_results) {\n  if (line.includes('ERROR')) {\n    const timestampRegex = /(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})/;\n    const timestampMatch = line.match(timestampRegex);\n    const timestamp = timestampMatch ? timestampMatch[1] : 'N/A';\n    const errorMessage = line.split('ERROR')[1].trim();\n    errors.push({ timestamp, message: errorMessage });\n  }\n}\ntaskResults.errors_results = errors;\nreturn errors;",
    "chat": "This subtask iterates through the \`last100Lines\` results and extracts timestamps and error messages for lines containing 'ERROR'. The extracted information is stored in the \`errors\` variable.",
    "resultVar": "errors"
  },
  {
    "task": "save_error_report:Save the extracted errors as a JSON file",
    "script": "await tools.file({ operation: 'write', path: 'error_report.json', data: JSON.stringify(taskResults.errors_results) });\nreturn 'Error report saved to error_report.json';",
    "chat": "This subtask writes the extracted errors (from the \`errors\` variable) to a JSON file named \`error_report.json\`."
  }
]
\`\`\`

\`\`\`json
[
  {
    "task": "create_project_structure:Create the directory structure for the project",
    "script": "await tools.busybox({ command: 'mkdir', args: ['my-node-project'] });\ntaskResults.projectPath_results = 'my-node-project';\nreturn 'Project directory created';", 
    "chat": "Creates the main project directory (\`my-node-project\`)",
    "resultVar": "projectPath"
  },
  {
    "task": "create_config_file:Create and populate the config.json file",
    "script": "const config = { welcomeMessage: 'Hello from the new Node.js project!' };\nawait tools.file({ operation: 'write', path: \`\${taskResults.projectPath_results}/config.json\`, data: JSON.stringify(config, null, 2) });\nreturn 'Configuration file created';", 
    "chat": "Creates \`config.json\` within the project directory and adds a default welcome message."
  },
  {
    "task": "generate_utils_module:Create the utils.js module with a logging function",
    "script": "const utilsCode = \`const logMessage = (message) => { console.log(message); };\nmodule.exports = { logMessage };\`;\nawait tools.file({ operation: 'write', path: \`\${taskResults.projectPath_results}/utils.js\`, data: utilsCode });\nreturn 'Utility module created';", 
    "chat": "Creates \`utils.js\` with a function to log messages to the console." 
  },
  {
    "task": "generate_index_file:Create the main index.js file with logic to load configuration and use the utils module",
    "script": "const indexCode = \`const config = require('./config.json');\nconst { logMessage } = require('./utils');\nlogMessage(config.welcomeMessage);\n\`;\nawait tools.file({ operation: 'write', path: \`\${taskResults.projectPath_results}/index.js\`, data: indexCode });\nreturn 'Index file created';", 
    "chat": "Creates \`index.js\`, which loads configuration and uses the \`logMessage\` function from \`utils.js\`."
  }
]
\`\`\`


CRITICAL: Verify the JSON output for accuracy and completeness before submission. *** OUTPUT ONLY JSON ***`;

      this.toolRegistry;
      const response = await convo.chat([
        {
          role: 'system',
          content: jsonPrompt(JSON.stringify(this.toolRegistry.schemas, null, 2))
        },
        {
          role: 'user',
          content: this.escapeTemplateLiteral(JSON.stringify({
            task: input,
          })),
        },
      ]);

      let tasks = response.content[0].text;
      tasks = await convo.chat([
        {
          role: 'system',
          content:  `Given some content that contains a JSON object or array, you ignore EVERYTHING BEFORE OR AFTER what is obviously JSON data, ignoring funky keys and weird data, and you output a syntactically-valid version of the JSON, with template literals properly escaped, on a single line. If the content contains no JSON data, you output a JSON object containing the input data, structured in the most appropriate manner for the data.`
        },
        {
          role: 'user',
          content: tasks,
        },
      ], {}, 'gemini-1.5-flash-001');
      tasks = tasks.content[0].text;

      let message = '';
      try {
        tasks = JSON.parse(tasks);
      } catch (error: any) {
        tasks = this.extractJson(tasks);
        message = error.message;
      }
      if (!Array.isArray(tasks) || tasks.length === 0) {
        this.emit('error', message);
        throw new Error('The task must be an array of subtasks. Check the format and try again. RETURN ONLY JSON RESPONSES' + message);
      }

      // Store new memory
      const initialConfidence = this.confidenceCalculator.calculateInitialConfidence(1.0, JSON.stringify(tasks));
      await this.memoryStore.storeMemory(input, JSON.stringify(tasks), initialConfidence);
      
      const results: any = [];

      this.store[input] = tasks;

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

        script = await convo.chat([
          {
            role: 'system',
            content: `Given some Javascript code, you validate its syntax and semantics, and you output a valid version of the code with template literals properly escaped. If the code is already valid, you output the original code with template literals properly escaped. <critical>YOU DO NOT OUTPUT ANY COMMENTARY, FORMATTING, OR ANYTHING AT ALL OTHER THAN CODE.</critical>`
          },
          {
            role: 'user',
            content: script,
          },
        ], {}, 'gemini-1.5-flash-001');
        script = script.content[0].text;

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

  // Execute a JavaScript script with retry and error handling using vm2
  async callScriptVM(script: string, retryLimit: number = 100): Promise<any> {
    let retryCount = 0;
    let context: any;

    while (retryCount < retryLimit) {
      try {
        // Create a new VM instance with a timeout
        const vm = new VM({
          timeout: 10000, // Set a timeout for script execution (in milliseconds)
          sandbox: {} // Start with an empty sandbox for security
        });

        context = {
          tools: {},
          taskResults: {},
          console: { log: console.log, error: console.error }, // Provide console access
          require: require, // Provide require access
          // Add other safe globals as needed
        };

        // Bind tools to the context
        const toolRegistry = ToolRegistry.getInstance(this);
        for (const toolName in toolRegistry.tools) {
          context.tools[toolName] = async (...args: any[]) => {
            return await this.callTool(toolName, args);
          };
          context[toolName] = context.tools[toolName]; // Allow direct tool access
        }

        // Bind task results to the context
        for (const task in this.store) {
          context.taskResults[task] = this.store[task];
          context[task] = this.store[task]; // Allow direct task result access
        }

        // Precompile the script for improved performanceit
        const compiledScript = new VMScript(`(async () => { ${script} })();`);

        // Run the compiled script in the VM's context
        const result = await vm.run(compiledScript, context);

        return result;

      } catch (error: any) {
        retryCount++;

        if (retryCount >= retryLimit) {
          errorLogger.logError({
            error: error.message,
            stackTrace: error.stack,
            script: script,
            retryAttempts: retryCount,
            context: context
          });
          throw new Error(`Script execution failed after ${retryLimit} attempts.`);
        }

        const errorMessage = error.message;
        const stackTrace: any = error.stack;
        const errorLine = this.extractErrorLine(stackTrace);

        errorLogger.logError({
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
              script: script,
              errorLine: errorLine,
            })
          });

          // Ensure llmResponse is parsed as JSON
          if (typeof llmResponse === 'string') {
            llmResponse = JSON.parse(llmResponse);
          }

          const { modifiedScript, explanation } = llmResponse as any;

          super.emit('error', explanation);

          // Update the script for the next retry
          script = modifiedScript;

        } catch (fixError) {
          // Handle errors during the script fixing process
          console.error("Error attempting to fix the script:", fixError);
          // You might choose to re-throw the error or handle it differently
        }
      }
    }

    throw new Error("Reached end of callScript function. This should not happen.");
  }

  private escapeTemplateLiteral(str: string): string {
    return str// .replace(/`/g, '\\`');
  }

  private unescapeTemplateLiteral(str: string): string {
    return str.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
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
        const toolRegistry = ToolRegistry.getInstance(this);
        for (const toolName in toolRegistry.tools) {
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
  
        // Use the existing script execution method
        const scriptFunction = new Function('context', `
          with (context) {
            return (async function() {
              ${escapedScript}
            })();
          }
        `);

        const result = await scriptFunction(context);

        for (const task in context.taskResults) {
          this.store[task] = context.taskResults[task];
        }
  
        return result;
      } catch (error: any) {
        console.error("Error calling script:", error);
  
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
  
          this.emit('error', explanation);
  
          // Update the script for the next retry
          script = this.unescapeTemplateLiteral(modifiedScript);
  
        } catch (fixError) {
          // Handle errors during the script fixing process
          console.error("Error attempting to fix the script:", fixError);
        }
  
        // Implement a retry delay if needed
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
      }
    }
  
    throw new Error("Reached end of callScript function. This should not happen.");
  }

  getSchemas() {
    const toolRegistry = ToolRegistry.getInstance(this);
    return toolRegistry.schemas;
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
      super.emit('text', question);
      this.chatWindow = (response: string) => {
        resolve(response);
      };
    });
  }

  // Extract JSON objects from a string
  extractJson(content: string) {
    const jsonObjects: any = [];
    let currentObject = '';
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (char === '{' && !inString) {
        openBraces++;
        currentObject += '{';
      } else if (char === '}' && !inString) {
        openBraces--;
        currentObject += char;
        if (openBraces === 0 && currentObject.trim() !== '') {
          try {
            jsonObjects.push(JSON.parse(currentObject));
            currentObject = '';
          } catch (error) {
            // Invalid JSON, ignore and continue
            currentObject = '';
          }
        }
      } else if (char === '[' && !inString) {
        openBrackets++;
        currentObject += char;
      } else if (char === ']' && !inString) {
        openBrackets--;
        currentObject += char;
      } else if (char === '"' && !escapeNext) {
        inString = !inString;
        currentObject += char;
      } else if (char === '\\' && !escapeNext) {
        escapeNext = true;
        currentObject += char;
      } else {
        escapeNext = false;
        currentObject += char;
      }
    }

    return jsonObjects.map(obj => {
      if (typeof obj === 'string') {
        return this.unescapeTemplateLiteral(obj);
      }
      return JSON.parse(this.unescapeTemplateLiteral(JSON.stringify(obj)));
    });
  }

}