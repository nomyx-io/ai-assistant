import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import Conversation from './conversation';
import { Assistant } from './types';
import { ScriptValidator } from './script/validator';
import { ScriptPerformanceMonitor } from './script/performanceMonitor';
import { ScriptCleanupManager } from './script/cleanupManager';
import { MetadataManager, ScriptMetadata } from './script/metadataManager';
import { ToolWatcher } from './toolWatcher';
import { log } from './logger';
import { parse, stringify } from 'flatted';
import JSON5 from 'json5';
import { v4 as uuidv4 } from 'uuid';
import { Tool } from './tool';

interface RegistryData {
  tools: Tool[];
}

export class ToolRegistry extends EventEmitter {
  private objectMap: Map<string, any> = new Map();
  public registryData: RegistryData;
  private registryFile: string;
  private loadedTools: Set<string>;
  private repoPath: string;
  private metricsFile: string;
  private metrics: { [key: string]: any };
  private testInterval: NodeJS.Timeout;
  public conversation: Conversation;

  public toolWatcher: ToolWatcher;

  constructor(registryFile: string = './.registry', repoPath: string = '../../tool_repo', metricsFile: string = './.metrics') {
    super();
    const registryFileP = path.join(__dirname, repoPath, registryFile);

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

    this.toolWatcher = new ToolWatcher(this);
    this.initializeToolWatcher();
  }

  public async initializeToolWatcher() {
    await this.toolWatcher.loadExistingTools();
  }

  private serializeWithRefs(obj: any): any {
    const seen = new Map();
    return JSON5.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return { $ref: seen.get(value) };
        }
        const id = uuidv4();
        seen.set(value, id);
        this.objectMap.set(id, value);
        return { $id: id, ...value };
      }
      return value;
    });
  }

  private deserializeWithRefs(json: string): any {
    const reviver = (key: string, value: any) => {
      if (value && value.$ref) {
        return this.objectMap.get(value.$ref);
      }
      if (value && value.$id) {
        const { $id, ...rest } = value;
        this.objectMap.set($id, rest);
        return rest;
      }
      return value;
    };
    return JSON5.parse(json, reviver);
  }

  private loadRegistry(): void {
    try {
      if (fs.existsSync(this.registryFile)) {
        const data = fs.readFileSync(this.registryFile, 'utf8');
        const parsedData = this.deserializeWithRefs(data);
        
        this.registryData = {
          tools: parsedData.tools.map((toolData: any) => 
            new Tool(
              this,
              toolData.name,
              toolData.version,
              toolData.description,
              toolData.source,
              toolData.tags,
              toolData.schema,
              toolData.metadata
            )
          )
        };
        
        log('info', 'Registry loaded successfully.', 'ToolRegistry');
      } else {
        this.registryData = { tools: [] };
        this.importToolsFromFile();
      }
    } catch (error) {
      log('error', `Error loading registry: ${error.message}`, 'ToolRegistry');
      this.registryData = { tools: [] };
    }
  }

  async addScriptAsTool(name: string, source: string, originalQuery: string): Promise<boolean> {
    const isValid = await ScriptValidator.validate(source);
    if (!isValid) {
      console.error(`Script ${name} failed validation`);
      return false;
    }

    const success = await this.addTool(name, source, {}, ['ai-generated']);
    if (success) {
      await MetadataManager.addMetadata(this, name, {
        originalQuery,
        creationDate: new Date(),
        author: 'AI Assistant',
        version: '1.0.0',
        tags: ['ai-generated'],
        dependencies: []
      });
    }
    return success;
  }

  async executeTool(name: string, params: any): Promise<any> {
    const startTime = Date.now();
    const result = await this.callTool(name, params);
    const executionTime = Date.now() - startTime;
    ScriptPerformanceMonitor.recordExecution(name, executionTime);
    return result;
  }

  async callTool(name: string, params: any): Promise<any> {
    const tool = this.registryData.tools.find(t => t.name === name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return await tool.call(params, this);
  }

  getTools(): { [key: string]: Tool } {
    return this.registryData.tools.reduce((tools, tool) => {
      tools[tool.name] = tool;
      return tools;
    }, {} as { [key: string]: Tool });
  }

  getActiveTools(): string[] {
    return this.registryData.tools.map(t => t.name);
  }
  
  async performMaintenance(): Promise<void> {
    await ScriptCleanupManager.cleanupUnusedScripts(this);
    // Other maintenance tasks...
  }

  private startContinuousTesting() {
    this.testAndImproveTools();
    this.testInterval = setInterval(() => {
      this.testAndImproveTools();
    }, 3600000);
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
      await tool.generateTestHarness();
    }
    try {
      await tool.runTests();
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
      const improvedCode = await this.conversation.chat([{
        role: 'system',
        content:
          'You are javascript developer working to improve javascript functions. Given the function\'s source code, schema, and any existing test results, <important>output an improved version of the function. If you cannot improve the function, output the original source code.</important><critical>output NO commentary, explanation or formatting</critical>',
      }, {
        role: 'user',
        content: `Tool Source: ${tool.source}\nSchema: ${JSON.stringify(tool.schema)}\nTest Results: ${JSON.stringify(tool.lastTestResult)}`,
      }], {} as any, 'gemini-1.5-flash-001');
      await this.updateTool(tool.name, improvedCode, tool.schema, tool.tags);
      this.emit('text', `Tool ${tool.name} improved based on test results`);
    } catch (error) {
      this.emit('error', `Error improving tool ${tool.name}:`, error);
    }
  }

  async updateMetrics(toolName: string, updateType: 'version' | 'test' | 'execution' | 'error' | 'usage', data: any): Promise<void> {
    if (!this.metrics[toolName]) {
      this.metrics[toolName] = {
        versions: [],
        totalUpdates: 0,
        lastUpdated: null,
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

    const metrics = this.metrics[toolName];

    switch (updateType) {
      case 'version':
        metrics.versions.push(data);
        metrics.totalUpdates++;
        metrics.lastUpdated = new Date().toISOString();
        break;
      case 'test':
        metrics.testResults.totalRuns++;
        if (data.success) {
          metrics.testResults.passed++;
        } else {
          metrics.testResults.failed++;
        }
        metrics.testResults.lastRun = new Date().toISOString();
        break;
      case 'execution':
        const executionTime = data;
        metrics.executionStats.totalExecutions++;
        metrics.executionStats.averageExecutionTime =
          (metrics.executionStats.averageExecutionTime * (metrics.executionStats.totalExecutions - 1) + executionTime) /
          metrics.executionStats.totalExecutions;
        metrics.executionStats.lastExecutionTime = executionTime;
        metrics.executionStats.fastestExecutionTime = Math.min(metrics.executionStats.fastestExecutionTime, executionTime);
        metrics.executionStats.slowestExecutionTime = Math.max(metrics.executionStats.slowestExecutionTime, executionTime);
        break;
      case 'error':
        metrics.errorRate = (metrics.errorRate * metrics.usageCount + (data ? 1 : 0)) / (metrics.usageCount + 1);
        break;
      case 'usage':
        metrics.usageCount++;
        break;
    }

    this.saveMetrics();
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
      };
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

  public saveRegistry(): void {
    try {
      const registryDataToSave = {
        tools: this.registryData.tools.map(tool => ({
          name: tool.name,
          version: tool.version,
          description: tool.description,
          source: tool.source,
          tags: tool.tags,
          schema: tool.schema,
          metadata: tool.metadata,
          metrics: tool.metrics
        }))
      };

      const serializedData = stringify(registryDataToSave);
      fs.writeFileSync(this.registryFile, serializedData, 'utf8');
      log('info', 'Registry saved successfully.', 'ToolRegistry');
    } catch (error) {
      log('error', `Error saving registry: ${error.message}`, 'ToolRegistry');
    }
  }

  public hasTool(name: string): boolean {
    return this.registryData.tools.some(t => t.name === name);
  }
  
  private async importToolsFromFile(): Promise<void> {
    try {
      const toolsModule = await import('./tools');
      for (const [name, tool] of Object.entries(toolsModule.tools)) {
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
      return JSON.parse(response.content[0].text);
    } catch (error) {
      console.error(`Error creating schema for tool ${tool}:`, error);
      throw error;
    }
  }

  public async cleanupToolCode(tool: string): Promise<string> {
    try {
      const messages = [{
        role: 'system',
        content: `You take the given Javascript and you:

1. fix any broken code, 
2. rewrite the function to remove awaiters and other intermediate-output code 
3. add any missing import statements - for example use \`const fs = await import('fs');\` for file system operations
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
      console.error(`Error cleaning up tool code for ${tool}:`, error);
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

  async loadTool(name: string): Promise<Tool | null> {
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

      this.loadedTools.add(name);
      console.log(`Tool ${name} loaded successfully.`);
      return tool;
    } catch (error) {
      console.error(`Error loading tool ${name}:`, error);
      return null;
    }
  }

  async updateTool(name: string, source: string, schema: any, tags: string[]): Promise<boolean> {
    try {
      const toolIndex = this.registryData.tools.findIndex(t => t.name === name);
      if (toolIndex === -1) {
        console.error(`Tool not found: ${name}`);
        return false;
      }

      const tool: Tool = this.registryData.tools[toolIndex];
      const newVersion = this.incrementVersion(tool.version);

      tool.version = newVersion;
      tool.source = source;
      tool.schema = schema;
      tool.tags = tags;
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
    // Implement input validation logic here
    return { valid: true, errors: [] };
  }

  private async saveToolToRepo(name: string, source: string, version: string): Promise<void> {
    try {
      const filePath = path.join(this.repoPath, `${name}.js`);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, source);
      console.log(`Tool ${name} v${version} saved to repository successfully.`);
    } catch (error) {
      console.error(`Error saving tool ${name} to repository:`, error);
    }
  }

  async callScript(script: string): Promise<any> {
    const tool = await this.getTool(script);
    if (tool) {
      return await this.callTool(tool.name, {});
    } else {
      // If not found as a tool, execute as a new script
      const taskId = `task_${Date.now()}`;
      await this.addTool(taskId, script, {
        name: taskId,
        description: 'Auto-generated task',
        methodSignature: `${taskId}(params: any, api: any): Promise<any>`,
      }, ['ai-generated']);
      return await this.callTool(taskId, {});
    }
  }

  async getTool(scriptOrName: string): Promise<Tool | null> {
    // First, try to find the tool by name
    const tool = this.tools[scriptOrName];
    if (tool) return tool;
  
    // If not found by name, check if any tool's source matches the script
    for (const t of Object.values(this.tools)) {
      if (t.source === scriptOrName) return t;
    }
  
    return null;
  }

  async rollbackTool(name: string, version: string): Promise<boolean> {
    try {
      const toolIndex = this.registryData.tools.findIndex(t => t.name === name);
      if (toolIndex === -1) {
        this.emit('error', `Tool not found: ${name}`);
        return false;
      }

      const tool = this.registryData.tools[toolIndex];
      const oldVersion = tool.version;
      tool.version = version;
      // Here you would typically retrieve the old source code for the specified version
      // and update the tool's source. For this example, we'll just update the version.
      this.saveRegistry();

      this.emit('text', `Tool ${name} rolled back from version ${oldVersion} to ${version} successfully.`);
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

  getCompactRepresentation(): any {
    return this.registryData.tools.map(tool => `${tool.schema.methodSignature} - ${tool.schema.description}`).join('\n');
  }

  async createNewToolWithLLM(
    description: string,
    schema: any,
    constraints: string[]
  ): Promise<Tool | null> {
    try {
      let toolCode = await this.conversation.chat([{
        role: 'system',
        content: `You create Javascript functions given a set of instructions. 
You will be given a description, a schema, and a set of constraints. 
Generate the JavaScript code for a tool that fulfills the requirements while observing the constraints..
Return a JSON object with the following format: { "name": "function_name", "description": "Brief description", "methodSignature": "function_name(param1: type, param2: type): returnType", "source": "function function_name(param1, param2) { ... }" }
You output only RAW JAVASCRIPT, WITHOUT ANY COMMENTARY, EXPLANATION or FORMATTING`
      }, {
        role: 'user',
        content: `Description: ${description}\nSchema: ${JSON.stringify(
          schema
        )}\nConstraints: ${constraints.join(', ')}`
      }], {} as any, 'gemini-1.5-flash-001');
      toolCode = toolCode.content[0].text;
      const { name, description: toolDescription, methodSignature, source } = JSON.parse(toolCode);

      const success = await this.addTool(
        name,
        source,
        { ...schema, description: toolDescription, methodSignature },
        []
      );
      if (success) {
        this.emit('text', `Tool ${name} created successfully.`);
        return this.tools[name];
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
      await tool.generateTestHarness();
      try {
        await tool.runTests();
      } catch (error) {
        this.emit('text', `Error running tests for tool ${tool.name}:`, error);
      }
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

    let analysisResult = await this.conversation.chat([{
      role: 'system',
      content: 'You are an AI assistant tasked with analyzing scripts and creating reusable tools. You return RAW JSON ONLY without any commentary or explanation.',
    }, {
      role: 'user',
      content: analysisPrompt + '\n\nREMEMBER TO RETURN RAW JSON ONLY WITHOUT ANY COMMENTARY OR EXPLANATION.',
    }]);

    if (analysisResult) {
      analysisResult = analysisResult.content[0].text;
      const { name, description, methodSignature, modifiedScript } = JSON.parse(analysisResult);
      
      if (name && description && methodSignature && modifiedScript) {
        const schema = {
          name,
          description,
          methodSignature
        };

        await this.addAutoGeneratedTool(name, modifiedScript, schema);
      }
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

      const reviewResult = await this.conversation.chat([{
        role: 'system',
        content: 'You are an AI assistant tasked with reviewing and maintaining the tool registry within which you operate.',
      }, {
        role: 'user',
        content: reviewPrompt
      }], {
        responseFormat: '{ "action": "string", "reason": "string", "modifications": "string" }'
      } as any);

      const { action, reason, modifications } = JSON.parse(reviewResult.content[0].text);

      switch (action) {
        case 'keep':
          console.log(`Tool '${tool.name}' kept. Reason: ${reason}`);
          break;
        case 'modify':
          await this.updateTool(tool.name, modifications, tool.schema, tool.tags);
          console.log(`Tool '${tool.name}' modified. Reason: ${reason}`);
          break;
        case 'remove':
          await this.removeTool(tool.name);
          console.log(`Tool '${tool.name}' removed. Reason: ${reason}`);
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

  async addTool(name: string, source: string, schema: any, tags: string[]): Promise<boolean> {
    if (this.registryData.tools.some(t => t.name === name)) {
      console.log(`Tool '${name}' already exists. Skipping addition.`);
      return false;
    }
    try {
      let standardizedSource = source;
      try {
        standardizedSource = await this.standardizeTool(name, source, schema);
      } catch (error) {
        console.warn(`Failed to standardize tool ${name}. Using original source.`, error);
      }

      const version = '1.0.0';
      const newTool = new Tool(this, name, version, schema.description, standardizedSource, tags, schema);

      this.registryData.tools.push(newTool);
      this.saveRegistry();

      await this.saveToolToRepo(name, standardizedSource, version);
      console.log(`Tool ${name} added successfully.`);
      return true;
    } catch (error) {
      console.error(`Error adding tool ${name}:`, error);
      return false;
    }
  }

  async performPeriodicMaintenance(): Promise<void> {
    await this.reviewAutoGeneratedTools();
    await this.improveTools();
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

  async standardizeTool(name: string, source: string, schema: any): Promise<string> {
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant tasked with standardizing tool code into a specific module format. Use the template below, incorporating the given code into the execute function. Fix any obvious issues and ensure the code is properly formatted and exported.
Template:

// This is javascript code for a tool module
class ${name}Tool {

  async execute(params, api) {
    // Tool implementation goes here
  }

}

module.exports = new ${name}Tool();`
    };
    const userMessage = {
      role: 'user',
      content: `Original Tool Code:
${source}

Schema:
${JSON.stringify(schema, null, 2)}
  
Please provide the complete standardized tool module code, including the class definition and export.
<critical>DO NOT include any commentary, explanation, or formatting. YOUR OUTPUT SHOULD BE RAW Javascript Code</critical>`,
    }
    let response = await this.conversation.chat([systemMessage, userMessage]);
    return response.content[0].text;
  }

  async predictLikelyTools(userRequest: string): Promise<string[]> {
    const existingTools = await this.getToolList();
    const existingToolNames = existingTools.map(tool => tool.name);

    const prompt = `Given the following user request and list of existing tools, predict the most likely tools to be used and suggest new tools that need to be created to service the task.
  
User Request: ${userRequest}

Existing Tools: ${existingToolNames.join(', ')}

Provide your response in the following JSON format:
{
  "likelyTools": ["tool1", "tool2", ...],
  "newTools": ["newTool1", "newTool2", ...]
}
      `;

    const response = await this.conversation.chat([{
      role: 'system',
      content: 'You are an AI assistant tasked with predicting and suggesting tools for a given task.',
    }, {
      role: 'user',
      content: prompt
    }], {
      responseFormat: '{ "likelyTools": string[], "newTools": string[] }'
    } as any);

    return [...response.likelyTools, ...response.newTools];
  }
}

export default ToolRegistry;