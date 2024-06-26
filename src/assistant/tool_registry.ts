import * as fs from 'fs';
import * as path from 'path';
import { tools } from './tools';
import { Assistant, RegistryData, Tool } from './types';
import Ajv from 'ajv';
import { EventEmitter } from 'stream';
import Conversation from './conversation';
import { confirmExecution } from './confirmation';
import { debugLog } from './errorLogger';

class ToolRegistry extends EventEmitter {

  private registryData: RegistryData;
  private registryFile: string;
  private loadedTools: Set<string>;
  private repoPath: string;
  private metricsFile: string;
  private metrics: { [key: string]: any };
  private testInterval: NodeJS.Timeout;

  private conversation: Conversation;


  constructor(registryFile: string = './.registry', repoPath: string = '../../tool_repo', metricsFile: string = './.metrics') {
    super();
    // create a path to the registry file relative to the current file
    const registryFileP = path.join(__dirname, repoPath, registryFile);
    // if the registry path and file arent found then create the registry path and file
    if (!fs.existsSync(registryFileP)) {
      fs.mkdirSync(path.dirname(registryFileP), { recursive: true });
      fs.writeFileSync(registryFileP, JSON.stringify({ tools: [] }), 'utf8');
    }
    this.registryFile = path.join(__dirname, repoPath, registryFile);
    this.repoPath = path.join(__dirname, repoPath);
    this.metricsFile = path.join(__dirname, repoPath, metricsFile);
    this.loadedTools = new Set();
    this.registryData = { tools: [] };
    this.conversation = new Conversation('claude');
    this.metrics = {};
    this.initializeRegistry();
    this.startContinuousTesting();
  }

  private startContinuousTesting() {
    this.testInterval = setInterval(() => {
      this.testAndImproveTools();
    }, 3600000); // Run every hour
  }

  private async testAndImproveTools() {
    for (const tool of this.registryData.tools) {
      const testResult = await this.testTool(tool);
      if (!testResult.success) {
        await this.improveTool(tool);
      }
    }
  }

  private async testTool(tool: Tool): Promise<{ success: boolean; error?: string }> {
    if (!tool.testHarness) {
      await this.generateTestHarness(tool);
    }
    try {
      await this.runTests(tool);
      return { success: tool.lastTestResult?.success || false, error: tool.lastTestResult?.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async improveTools(): Promise<void> {
    for (const tool of this.registryData.tools) {
      if (tool.lastTestResult && !tool.lastTestResult.success) {
        await this.improveTool(tool);
      }
    }
  }

  private async improveTool(tool: Tool): Promise<void> {
    try {
      const improvedCode = await this.callTool('callLLM', {
        system_prompt:
          'You are a tool improver. Given a tool\'s source code, schema, and test results, suggest improvements to fix any issues.',
        prompt: `Tool Source: ${tool.source}\nSchema: ${JSON.stringify(tool.schema)}\nTest Results: ${JSON.stringify(tool.lastTestResult)}`,
        model: 'gemini-1.5-flash-001',
      });

      await this.updateTool(tool.name, improvedCode);
      this.emit('text', `Tool ${tool.name} improved based on test results`);
    } catch (error) {
      this.emit('error', `Error improving tool ${tool.name}:`, error);
    }
  }

  async generateReport(format: 'text' | 'json' = 'text'): Promise<string | object> {
    if (format === 'json') {
      return this.metrics;
    }

    let report = "Tool Registry Report\n=====================\n\n";

    for (const [toolName, toolMetrics] of Object.entries(this.metrics)) {
      report += `Tool: ${toolName}\n`;
      report += `------------------\n`;
      report += `Current Version: ${toolMetrics.versions[toolMetrics.versions.length - 1]}\n`;
      report += `Total Updates: ${toolMetrics.totalUpdates}\n`;
      report += `Last Updated: ${toolMetrics.lastUpdated}\n`;
      report += `Test Results:\n`;
      report += `  Total Runs: ${toolMetrics.testResults.totalRuns}\n`;
      report += `  Passed: ${toolMetrics.testResults.passed}\n`;
      report += `  Failed: ${toolMetrics.testResults.failed}\n`;
      report += `  Last Run: ${toolMetrics.testResults.lastRun}\n`;
      report += `Execution Stats:\n`;
      report += `  Total Executions: ${toolMetrics.executionStats.totalExecutions}\n`;
      report += `  Average Execution Time: ${toolMetrics.executionStats.averageExecutionTime.toFixed(2)}ms\n`;
      report += `  Fastest Execution Time: ${toolMetrics.executionStats.fastestExecutionTime.toFixed(2)}ms\n`;
      report += `  Slowest Execution Time: ${toolMetrics.executionStats.slowestExecutionTime.toFixed(2)}ms\n`;
      report += `  Last Execution Time: ${toolMetrics.executionStats.lastExecutionTime?.toFixed(2)}ms\n`;
      report += `Error Rate: ${(toolMetrics.errorRate * 100).toFixed(2)}%\n`;
      report += `Usage Count: ${toolMetrics.usageCount}\n\n`;
    }

    return report;
  }
  get tools(): { [key: string]: Tool } {
    return this.registryData.tools.reduce((tools, tool) => {
      tools[tool.name] = tool;
      return tools;
    }, {} as { [key: string]: Tool });
  }

  get schemas(): any {
    return this.registryData.tools.reduce((schemas, tool) => {
      schemas[tool.name] = tool.schema;
      return schemas;
    }, {} as any);
  }

  private async initializeRegistry(): Promise<void> {
    try {
      if (!fs.existsSync(this.registryFile)) {
        await this.importToolsFromFile();
      } else {
        console.log('Loading registry from file...');
        this.loadRegistry();
      } 
    } catch (error) {
      console.error('Error initializing registry:', error);
      this.registryData = { tools: [] };
    }
  }
  async getToolHistory(name: string): Promise<string[]> {
    const tool = this.registryData.tools.find(t => t.name === name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return this.metrics[name]?.versions || [];
  }
  private loadRegistry(): void {
    try {
      if (fs.existsSync(this.registryFile)) {
        const data = fs.readFileSync(this.registryFile, 'utf8');
        this.registryData = JSON.parse(data);
        console.log('Registry loaded successfully.');
      } else {
        this.registryData = { tools: [] };
        // load tools from tools.ts file
        this.importToolsFromFile();
      }
    } catch (error) {
      console.error('Error loading registry:', error);
      this.registryData = { tools: [] };
    }
  }

  private saveRegistry(): void {
    try {
      const registryDataWithoutFunctions = JSON.parse(JSON.stringify(this.registryData));
      // Remove the 'execute' function from each tool before saving
      registryDataWithoutFunctions.tools.forEach(tool => {
        delete tool.execute;
        if (tool.source) {
          // Preserve newlines in the source code
          tool.source = tool.source.replace(/\\n/g, '\n');
        }
      });
      const data = JSON.stringify(registryDataWithoutFunctions, (key, value) => {
        if (typeof value === 'function') {
          return value.toString();
        }
        return value;
      }, 2); // Add indentation of 2 spaces
      fs.writeFileSync(this.registryFile, data, 'utf8');
      console.log('Registry saved successfully.');
    } catch (error) {
      console.error('Error saving registry:', error);
    }
  }

  private async importToolsFromFile(): Promise<void> {
    try {
      for (const [name, tool] of Object.entries(tools)) {
        await this.addTool(name, tool.execute.toString(), tool.schema || {}, tool.tags || []);
      }
      console.log('Tools imported from tools.ts file.');
    } catch (error) {
      console.error('Error importing tools from file:', error);
    }
  }

  public async getToolList(): Promise<Tool[]> {
    return this.registryData.tools;
  }

  public async createToolSchema(tool: string): Promise<any> {
    try {
      const messages = [{
        role: 'system',
        content: "Given the source code of a tool, you generate a schema for it. Example schema 1: { 'name': 'file', 'description': 'Performs file operations like read, write, append, prepend, replace, insert, remove, delete, copy', 'input_schema': { 'type': 'object', 'properties': { 'operation': { 'type': 'string', 'description': 'The operation to perform on the file. Supported operations: read, write, append, prepend, replace, insert_at, remove, delete, copy', 'enum': ['read', 'write', 'append', 'prepend', 'replace', 'insert_at', 'remove', 'delete', 'copy'], }, 'path': { 'type': 'string', 'description': 'The path to the file. Required for all operations except 'list_attached'.', }, 'match': { 'type': 'string', 'description': 'The string or regex pattern to match. Required for 'replace' and 'remove' operations.', }, 'data': { 'type': 'string', 'description': 'The data to write, append, prepend, replace, or insert. Required for 'write', 'append', 'prepend', 'replace', and 'insert_at' operations.', }, 'position': { 'type': 'number', 'description': 'The position to insert the data at. Required for 'insert_at' operation.', }, 'target': { 'type': 'string', 'description': 'The target path for the 'copy' operation.', }, }, 'required': ['operation'], }, 'output_schema': { 'type': 'string', 'description': 'A message indicating the result of the file operation.', }, }\n\nExample Schema 2: {'name': 'files', 'description': 'Performs batch file operations.', 'input_schema': {'type': 'object', 'properties': {'operations': {'type': 'array', 'description': 'An array of file operations to perform.', 'items': {'type': 'object', 'properties': {'operation': {'type': 'string', 'description': 'The operation to perform on the file.', 'enum': ['read', 'append', 'prepend', 'replace', 'insert_at', 'remove', 'delete', 'copy', 'attach', 'list_attached', 'detach']}, 'path': {'type': 'string', 'description': 'The path to the file. Required for all operations except 'list_attached'.', }, 'match': {'type': 'string', 'description': 'The string or regex pattern to match. Required for 'replace' and 'remove' operations.', }, 'data': {'type': 'string', 'description': 'The data to write, append, prepend, replace, or insert. Required for 'write', 'append', 'prepend', 'replace', and 'insert_at' operations.', }, 'position': {'type': 'number', 'description': 'The position to insert the data at. Required for 'insert_at' operation.', }, 'target': {'type': 'string', 'description': 'The target path for the 'copy' operation.', }, }, 'required': ['operation']}}}, 'required': ['operations']}, 'output_schema': {'type': 'string', 'description': 'A message indicating the result of the batch file operations.'}},",
      }, {
        role: 'user',
        content: 'Examine the source code of the tool and generate a schema for it: ' + JSON.stringify(tool)
      }];
      const response = await this.conversation.chat(messages);
      return response.content[0].text;
    } catch (error) {
      console.error(`Error creating schema for tool ${tool}:`, error);
      throw error;
    }
  }

  public async cleanupToolCode(tool: string): Promise<any> {
    try {
      const messages = [{
        role: 'system',
        content: `You take the given Javascript and you:

1. fix any broken code, 
2. rewrite the function to remove awaiters and other intermediate-output code 
3. add any missng import statements - for example use \`const fs = await import('fs');\` for file system operations
4. Do NOT export the function, just return it as a string
5. FORMAT THE FUNCTION NICELY OVER MULTIPLE LINES

You output only RAW JAVASCRIPT, WITHOUT ANY COMMENTARY, EXPLANATION or FORMATTING`
      }, {
        role: 'user',
        content: tool
      }];
      let response = await this.conversation.chat(messages);
      response = response.content[0].text;
      response = response.replace(/.*```javascript/g, '');
      response = response.replace(/.*```/g, '');
      response = response.replace(/[\r\n]+/g, '');
      return response;
    } catch (error) {
      console.error(`Error creating schema for tool ${tool}:`, error);
      throw error;
    }
  }

  public async addToolSchema(tool: string, schema: any): Promise<boolean> {
    try {
      const toolIndex = this.registryData.tools.findIndex(t => t.name === tool);
      if (toolIndex === -1) {
        console.error(`Tool not found: ${tool}`);
        return false;
      }
      this.registryData.tools[toolIndex].schema = schema;
      this.saveRegistry();
      console.log(`Schema added for tool ${tool}`);
      return true;
    } catch (error) {
      console.error(`Error adding schema to tool ${tool}:`, error);
      return false;
    }
  }

  async loadTool(name: string): Promise<string | null> {
    try {
      if (this.loadedTools.has(name)) {
        console.log(`Tool ${name} already loaded.`);
        return null;
      }

      const tool = this.registryData.tools.find(t => t.name === name);
      if (!tool) {
        console.error(`Tool not found: ${name}`);
        return null;
      }

      const toolSource = await this.getToolSourceFromRepo(name, tool.version);
      if (!toolSource) {
        console.error(`Source code not found for tool ${name} version ${tool.version}`);
        return null;
      }

      this.loadedTools.add(name);
      console.log(`Tool ${name} loaded successfully.`);
      return toolSource;
    } catch (error) {
      console.error(`Error loading tool ${name}:`, error);
      return null;
    }
  }

  async updateTool(name: string, source: string): Promise<boolean> {
    try {
      const toolIndex = this.registryData.tools.findIndex(t => t.name === name);
      if (toolIndex === -1) {
        console.error(`Tool not found: ${name}`);
        return false;
      }

      const tool = this.registryData.tools[toolIndex];
      const newVersion = this.incrementVersion(tool.version);

      tool.version = newVersion;
      tool.source = source;
      tool.active = true;
      this.saveRegistry();

      await this.saveToolToRepo(name, source, newVersion);
      console.log(`Tool ${name} updated to version ${newVersion}.`);
      this.updateMetrics(name, 'version', newVersion);
      return true;
    } catch (error) {
      console.error(`Error updating tool ${name}:`, error);
      return false;
    }
  }

  validateToolInput(toolName: string, params: any): { valid: boolean; errors: any[] } {
    const tool = this.tools[toolName];
    if (!tool || !tool.schema) {
      return { valid: true, errors: [] };
    }
    // const validate = this.ajv.compile(tool.schema.input_schema);
    const valid = true// validate(params);
    return { valid, errors: [] };
  }

  private async saveToolToRepo(name: string, source: string, version: string): Promise<void> {
    try {
      const filePath = path.join(this.repoPath, `${name}.ts`);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, source);
      console.log(`Tool ${name} v${version} saved to repository successfully.`);
    } catch (error) {
      console.error(`Error saving tool ${name} to repository:`, error);
    }
  }

  private async getToolSourceFromRepo(name: string, version: string): Promise<string | null> {
    try {
      const filePath = path.join(this.repoPath, `${name}.ts`);
      if (fs.existsSync(filePath)) {
        const source = fs.readFileSync(filePath, 'utf8');
        console.log(`Tool ${name} v${version} retrieved from repository successfully.`);
        return source;
      }
      return null;
    } catch (error) {
      console.error(`Error getting tool ${name} from repository:`, error);
      return null;
    }
  }

  async callTool(name: string, params: any): Promise<any> {
    try {
      const tool = this.registryData.tools.find(t => t.name === name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }
  
      if (typeof tool.execute !== 'function') {
        throw new Error(`Tool ${name} does not have a valid execute function`);
      }
  
      return await tool.execute(params, this as any);
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      throw error;
    }
  }

  async rollbackTool(name: string, version: string): Promise<boolean> {
    try {
      const toolIndex = this.registryData.tools.findIndex(t => t.name === name);
      if (toolIndex === -1) {
        this.emit('error', `Tool not found: ${name}`);
        return false;
      }

      const source = await this.getToolSourceFromRepo(name, version);
      if (!source) {
        this.emit('error', `Source code not found for tool ${name} version ${version}`);
        return false;
      }

      const tool = this.registryData.tools[toolIndex];
      tool.version = version;
      tool.source = source;
      tool.active = true;
      this.saveRegistry();

      this.emit('text', `Tool ${name} rolled back to version ${version} successfully.`);
      this.updateMetrics(name, 'version', version);
      return true;
    } catch (error) {
      this.emit('error', `Error rolling back tool ${name}:`, error);
      return false;
    }
  }

  private incrementVersion(version: string): string {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  async getToolVersion(name: string, version: string): Promise<Tool | null> {
    const tool = this.registryData.tools.find(t => t.name === name);
    if (!tool) {
      return null;
    }
    const source = await this.getToolSourceFromRepo(name, version);
    if (!source) {
      return null;
    }
    return { ...tool, version, source };
  }

  async getToolTags(name: string): Promise<string[]> {
    const tool = this.registryData.tools.find(t => t.name === name);
    return tool ? tool.tags || [] : [];
  }

  async initialize(): Promise<void> {
    await this.initializeRegistry();
    this.loadMetrics();
    for (const tool of this.registryData.tools) {
      await this.loadTool(tool.name);
    }
    await this.generateAndRunTests();
  }

  async createNewToolWithLLM(
    description: string,
    schema: any,
    constraints: string[]
  ): Promise<Tool | null> {
    try {
      const toolCode = await this.callTool('callLLM', {
        system_prompt:
          'You are a tool creator. You will be given a description, a schema, and a set of constraints. Generate the JavaScript code for a tool that fulfills these requirements.',
        prompt: `Description: ${description}\nSchema: ${JSON.stringify(
          schema
        )}\nConstraints: ${constraints.join(', ')}`,
        model: 'gemini-1.5-flash-001',
      });

      const toolName = schema.name;
      const success = await this.addTool(
        toolName,
        toolCode,
        schema,
        []
      );
      if (success) {
        this.emit('text', `Tool ${toolName} created successfully.`);
        return this.tools[toolName];
      } else {
        this.emit('error', 'Failed to add the generated tool to the registry.');
        return null;
      }
    } catch (error) {
      this.emit('error', 'Error creating tool with LLM:', error);
      return null;
    }
  }

  async generateAndRunTests(): Promise<void> {
    for (const tool of this.registryData.tools) {
      if (!tool.testHarness) {
        await this.generateTestHarness(tool);
      }
      try {
        await this.runTests(tool);
      } catch (error) {
        this.emit('text', `Error running tests for tool ${tool.name}:`, error);
      }
    }
  }

  private async generateTestHarness(tool: Tool): Promise<void> {
    try {
      const messages = [{
        role: 'system',
        content: `You are a test coverage generator for javascript functions. Given a javascript function and its schema and description, you generate a test harness which thoroughly tests the function. You write your test harnesses in the following format:

\`\`\`javascript
const testHarness = {
    beforeAll: (context) => {
        context.log('beforeAll');
    },
    test1: (context) => {
        context.log('test1');
        context.assert(true, 'Test 1 passed');
    },
    test2: (context) => {
        context.log('test2');
    },
};
\`\`\`

You output RAW Javascript CODE ONLY. Do not include any comments or explanations in the code.`
      }, {
        role: 'user',
        content: `Tool Source:\n\n${JSON.stringify(tool.source)}\n\nSchema:\n\n${JSON.stringify(tool.schema)}\n\n`,
      }];
      let response = await this.conversation.chat(messages);
      response = response.content[0].text;
      tool.testHarness = response;
      this.saveRegistry();
      this.emit('text', `Test harness generated for tool ${tool.name}`);
    } catch (error) {
      this.emit('error', `Error generating test harness for tool ${tool.name}:`, error);
    }
  }

  private async runTests(tool: Tool): Promise<void> {
    if (!tool.testHarness) {
      this.emit('error', `No test harness found for tool ${tool.name}`);
      return;
    }
    try {
      const context = {
        log: console.log,
        assert: (condition: boolean, message: string) => {
          this.emit('text', message);
          if (!condition) {
            throw new Error(message);
          }
        }
      };
      await (tool.testHarness as any).beforeAll(context);
      for (const key in (tool.testHarness as any)) {
        if (key !== 'beforeAll') {
          await tool.testHarness[key](context);
        }
      }

      tool.lastTestResult = {
        success: true,
        message: 'All tests passed successfully',
      };

      this.saveRegistry();
      this.updateMetrics(tool.name, 'test', { success: true });
    } catch (error) {
      this.emit('error', `Error running tests for tool ${tool.name}:`, error);
      tool.lastTestResult = {
        success: false,
        message: `Test failed: ${error.message}`,
      };
      this.updateMetrics(tool.name, 'test', { success: false });
    }
  }

  async analyzeAndCreateToolFromScript(script: string, taskDescription: string): Promise<void> {
    const existingTools = await this.getToolList();
    const existingToolNames = existingTools.map(tool => tool.name);

    const analysisPrompt = `
      Given the following script and task description, determine if this script represents a unique and reusable functionality not adequately covered by existing tools.

      Existing tools: ${existingToolNames.join(', ')}

      Script:
      ${script}

      Task Description:
      ${taskDescription}

      If this script represents a unique and reusable functionality, provide the following in JSON format:
      1. A semantically-meaningful function name
      2. A brief description of the tool's functionality
      3. A method signature
      4. Any necessary modifications to make the script more generalized and reusable

      If the functionality is already adequately represented by existing tools, return null.

      Response format:
      {
        "name": "function_name",
        "description": "Brief description",
        "methodSignature": "function_name(param1: type, param2: type): returnType",
        "modifiedScript": "// Modified script code"
      }
    `;

    const analysisResult = await this.callTool('callLLM', {
      system_prompt: 'You are an AI assistant tasked with analyzing scripts and creating reusable tools.',
      prompt: analysisPrompt,
      responseFormat: '{ "name": "string", "description": "string", "methodSignature": "string", "modifiedScript": "string" }'
    });

    if (analysisResult) {
      const { name, description, methodSignature, modifiedScript } = analysisResult;
      const schema = {
        name,
        description,
        methodSignature
      };

      await this.addAutoGeneratedTool(name, modifiedScript, schema);
    }
  }

  async addAutoGeneratedTool(name: string, source: string, schema: any): Promise<boolean> {
    const similarTool = this.registryData.tools.find(tool => 
      tool.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(tool.name.toLowerCase())
    );

    if (similarTool) {
      console.log(`Similar tool '${similarTool.name}' already exists. Skipping addition.`);
      return false;
    }

    return this.addTool(name, source, schema, ['auto-generated']);
  }

  async reviewAutoGeneratedTools(): Promise<void> {
    const autoGeneratedTools = this.registryData.tools.filter(tool => tool.tags.includes('auto-generated'));

    for (const tool of autoGeneratedTools) {
      const reviewPrompt = `
Review the following auto-generated tool and determine if it should be kept, modified, or removed:

Name: ${tool.name}
Description: ${tool.schema.description}
Method Signature: ${tool.schema.methodSignature}
Source:
${tool.source}

Provide your recommendation in JSON format:
{
  "action": "keep" | "modify" | "remove",
  "reason": "Brief explanation",
  "modifications": "If action is 'modify', provide the modified source code here"
}
`;

      const reviewResult = await this.callTool('callLLM', {
        system_prompt: 'You are an AI assistant tasked with reviewing and maintaining the tool registry.',
        prompt: reviewPrompt,
        responseFormat: '{ "action": "string", "reason": "string", "modifications": "string" }'
      });

      switch (reviewResult.action) {
        case 'keep':
          console.log(`Tool '${tool.name}' kept. Reason: ${reviewResult.reason}`);
          break;
        case 'modify':
          await this.updateTool(tool.name, reviewResult.modifications);
          console.log(`Tool '${tool.name}' modified. Reason: ${reviewResult.reason}`);
          break;
        case 'remove':
          await this.removeTool(tool.name);
          console.log(`Tool '${tool.name}' removed. Reason: ${reviewResult.reason}`);
          break;
      }
    }
  }

  async removeTool(name: string): Promise<boolean> {
    const initialLength = this.registryData.tools.length;
    this.registryData.tools = this.registryData.tools.filter(tool => tool.name !== name);
    const removed = this.registryData.tools.length < initialLength;
    if (removed) {
      this.saveRegistry();
      console.log(`Tool '${name}' removed successfully.`);
    }
    return removed;
  }

  // Modify the existing addTool method to include the 'auto-generated' tag if applicable
  async addTool(name: string, source: string, schema: any, tags: string[]): Promise<boolean> {
    try {
      if (this.registryData.tools.some(t => t.name === name)) {
        return false;
      }
  
      const version = '1.0.0';
      const newTool: Tool = {
        name,
        version,
        source,
        schema,
        tags,
        active: true,
        execute: new Function('params', 'api', `return (async () => { ${source} })();`)
      };
  
      this.registryData.tools.push(newTool);
      this.saveRegistry();
  
      await this.saveToolToRepo(name, source, version);
      console.log(`Tool ${name} added successfully.`);
      return true;
    } catch (error) {
      console.error(`Error adding tool ${name}:`, error);
      return false;
    }
  }

  // Add a method to perform periodic maintenance
  async performPeriodicMaintenance(): Promise<void> {
    await this.reviewAutoGeneratedTools();
    // Add any other maintenance tasks here
  }

  private loadMetrics(): void {
    try {
      if (fs.existsSync(this.metricsFile)) {
        const data = fs.readFileSync(this.metricsFile, 'utf8');
        this.metrics = JSON.parse(data);
        console.log('Metrics loaded successfully.');
      } else {
        this.metrics = {};
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
      this.metrics = {};
    }
  }

  private saveMetrics(): void {
    try {
      const data = JSON.stringify(this.metrics, null, 2);
      fs.writeFileSync(this.metricsFile, data, 'utf8');
      console.log('Metrics saved successfully.');
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  private initializeMetrics(toolName: string): void {
    if (!this.metrics[toolName]) {
      this.metrics[toolName] = {
        versions: [],
        totalUpdates: 0,
        lastUpdated: new Date().toISOString(),
        testResults: {
          totalRuns: 0,
          passed: 0,
          failed: 0,
          lastRun: null,
        },
        executionStats: {
          totalExecutions: 0,
          averageExecutionTime: 0,
          lastExecutionTime: null,
          fastestExecutionTime: Infinity,
          slowestExecutionTime: 0,
        },
        errorRate: 0,
        usageCount: 0,
      };
    }
  }

  private updateMetrics(toolName: string, updateType: 'version' | 'test' | 'execution' | 'error' | 'usage', data: any): void {
    this.initializeMetrics(toolName);
    const toolMetrics = this.metrics[toolName];

    switch (updateType) {
      case 'version':
        toolMetrics.versions.push(data);
        toolMetrics.totalUpdates++;
        toolMetrics.lastUpdated = new Date().toISOString();
        break;
      case 'test':
        toolMetrics.testResults.totalRuns++;
        if (data.success) {
          toolMetrics.testResults.passed++;
        } else {
          toolMetrics.testResults.failed++;
        }
        toolMetrics.testResults.lastRun = new Date().toISOString();
        break;
      case 'execution':
        const executionTime = data;
        toolMetrics.executionStats.totalExecutions++;
        toolMetrics.executionStats.averageExecutionTime =
          (toolMetrics.executionStats.averageExecutionTime * (toolMetrics.executionStats.totalExecutions - 1) + executionTime) /
          toolMetrics.executionStats.totalExecutions;
        toolMetrics.executionStats.lastExecutionTime = executionTime;
        toolMetrics.executionStats.fastestExecutionTime = Math.min(toolMetrics.executionStats.fastestExecutionTime, executionTime);
        toolMetrics.executionStats.slowestExecutionTime = Math.max(toolMetrics.executionStats.slowestExecutionTime, executionTime);
        break;
      case 'error':
        toolMetrics.errorRate = (toolMetrics.errorRate * toolMetrics.usageCount + (data ? 1 : 0)) / (toolMetrics.usageCount + 1);
        break;
      case 'usage':
        toolMetrics.usageCount++;
        break;
    }

    this.saveMetrics();
  }
}

export const toolRegistryTools = {
  analyze_and_create_tool: {
    name: 'analyze_and_create_tool',
    version: '1.0.0',
    description: 'Analyze a script and create a new tool if it represents unique functionality',
    schema: {
      "description": "Analyze a script and create a new tool if it represents unique functionality",
      "methodSignature": "analyze_and_create_tool({ script: string, taskDescription: string }): Promise<void>",
    },
    execute: async (params: any, api: any) => {
      const { script, taskDescription } = params;
      await api.analyzeAndCreateToolFromScript(script, taskDescription);
    }
  },
  registry_management: {
    name: 'registry_management',
    version: '1.0.0',
    description: 'Manage the tool registry',
    schema: {
      "description": "Manage the tool registry",
      "methodSignature": "registryManagementTool({ action: 'list' | 'add' | 'update' | 'rollback' | 'history'; name?: string; source?: string; tags?: string[]; version?: string; }): any",
    },
    execute: async (params: any, api: any) => {
      if (!Array.isArray(params)) params = [params];
      const results = [];
      for (const param of params) {
        debugLog(`registryManagementTool called with params: ${JSON.stringify(params)}`);
        const confirmed = await confirmExecution(api, `Add tool '\${name}' with the provided source and tags?`);
        if (!confirmed) {
          return false;
        }
        const callFunction = async (params: any) => {
          const { action, name, source, schema, tags, version } = params;
          switch (action) {
            case 'list':
              return api.getToolList();
            case 'add':
              debugLog(`Adding tool: ${name} with source: ${source} and tags: ${tags}`);
              return api.addTool(name, source, schema, tags);
            case 'update':
              debugLog(`Updating tool: ${name} with source: ${source}`);
              return api.updateTool(name!, source!);
            case 'rollback':
              debugLog(`Rolling back tool: ${name} to version: ${version}`);
              return api.rollbackTool(name, version);
            case 'history':
              return api.getToolHistory(name);
            default:
              throw new Error(`Invalid action: ${action}`);
          }
        }
        results.push(await callFunction(param));
      }
      return results;
    }
  }
}




export default ToolRegistry;