import * as fs from 'fs';
import * as path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { tools } from './tools';
import { RegistryData, Tool } from './types';
import Ajv from 'ajv';
import { EventEmitter } from 'stream';

class ToolRegistry extends EventEmitter {
  static instance: ToolRegistry;

  private registryData: RegistryData;
  private registryFile: string;
  private loadedTools: Set<string>;
  private git: SimpleGit;
  private repoPath: string;
  private ajv: any = new Ajv({ allErrors: true });

  constructor(registryFile: string = './.registry', repoPath: string = './tool_repo') {
    super();
    this.registryFile = path.resolve([__dirname, '../..', repoPath, registryFile].join('/'));
    this.repoPath = path.resolve([__dirname, '../..', repoPath].join('/'));
    this.loadedTools = new Set();
    this.registryData = { tools: [] };
    this.git = simpleGit();

    for (const toolName in tools) {
      const tool = tools[toolName];
      this.registryData.tools.push({
        name: toolName,
        version: '1.0.0',
        source: (tool.execute || tool.action).toString(),
        schema: tool.schema,
        tags: tool.tags || [],
        active: true,
        execute: tool.execute || tool.action
      }); 

      this.saveToolToRepo(toolName, (tool.execute || tool.action).toString(), '1.0.0');
    }
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
      await this.initializeGitRepo();
      if (!fs.existsSync(this.registryFile)) {
        await this.importDefaultTools();
      } else {
        this.emit('text', 'Loading registry from file...');
      }
      this.loadRegistry();
    } catch (error) {
      this.emit('error', 'Error initializing registry:', error);
      this.registryData = { tools: [] };
    }
  }

  private async initializeGitRepo(): Promise<void> {
    try {
      if (!fs.existsSync(path.join(this.repoPath, '.git'))) {
        this.emit('text', 'Initializing Git repository...');
        fs.mkdirSync(this.repoPath, { recursive: true });
        this.git = simpleGit({ baseDir: this.repoPath });
        await this.git.init();
        await this.git.add('.gitignore');
        await this.git.commit('Initial commit');
        this.emit('text', 'Git repository initialized.');
      } else {
        this.emit('text', 'Git repository already exists.');
      }
      this.git = simpleGit({ baseDir: this.repoPath });
    } catch (error) {
      this.emit('error', 'Error initializing Git repository:', error);
      throw error;
    }
  }

  private loadRegistry(): void {
    try {
      if(fs.existsSync(this.registryFile)) {
        const data = fs.readFileSync(this.registryFile, 'utf8');
        this.registryData = JSON.parse(data);
        this.emit('text', 'Registry loaded successfully.');
      } else {
        this.registryData = { tools: [] };
      }
    } catch (error) {
      this.emit('error', 'Error loading registry:', error);
      this.registryData = { tools: [] };
    }
  }

  private saveRegistry(): void {
    try {
      const data = JSON.stringify(this.registryData, null, 2);
      fs.writeFileSync(this.registryFile, data, 'utf8');
      this.emit('text', 'Registry saved successfully.');
    } catch (error) {
      this.emit('error', 'Error saving registry:', error);
    }
  }

  private async importDefaultTools(): Promise<void> {
    try {
      for (const toolName in tools) {
        const tool = tools[toolName];
        const source = tool.toString();
        await this.addTool(toolName, source, tool.schema, tool.tags || []);
      }
    } catch (error) {
      this.emit('error', 'Error importing default tools:', error);
    }
  }

  public async getToolList(): Promise<Tool[]> {
    return this.registryData.tools;
  }

  public async createToolSchema(tool: string): Promise<any> {
    try {
      const schema = await this.callTool('callLLM', {
        system_prompt:
          "Given the source code of a tool, you generate a schema for it. Example schema 1: { 'name': 'file', 'description': 'Performs file operations like read, write, append, prepend, replace, insert, remove, delete, copy', 'input_schema': { 'type': 'object', 'properties': { 'operation': { 'type': 'string', 'description': 'The operation to perform on the file. Supported operations: read, write, append, prepend, replace, insert_at, remove, delete, copy', 'enum': ['read', 'write', 'append', 'prepend', 'replace', 'insert_at', 'remove', 'delete', 'copy'], }, 'path': { 'type': 'string', 'description': 'The path to the file. Required for all operations except 'list_attached'.', }, 'match': { 'type': 'string', 'description': 'The string or regex pattern to match. Required for 'replace' and 'remove' operations.', }, 'data': { 'type': 'string', 'description': 'The data to write, append, prepend, replace, or insert. Required for 'write', 'append', 'prepend', 'replace', and 'insert_at' operations.', }, 'position': { 'type': 'number', 'description': 'The position to insert the data at. Required for 'insert_at' operation.', }, 'target': { 'type': 'string', 'description': 'The target path for the 'copy' operation.', }, }, 'required': ['operation'], }, 'output_schema': { 'type': 'string', 'description': 'A message indicating the result of the file operation.', }, }\n\nExample Schema 2: {'name': 'files', 'description': 'Performs batch file operations.', 'input_schema': {'type': 'object', 'properties': {'operations': {'type': 'array', 'description': 'An array of file operations to perform.', 'items': {'type': 'object', 'properties': {'operation': {'type': 'string', 'description': 'The operation to perform on the file.', 'enum': ['read', 'append', 'prepend', 'replace', 'insert_at', 'remove', 'delete', 'copy', 'attach', 'list_attached', 'detach']}, 'path': {'type': 'string', 'description': 'The path to the file. Required for all operations except 'list_attached'.', }, 'match': {'type': 'string', 'description': 'The string or regex pattern to match. Required for 'replace' and 'remove' operations.', }, 'data': {'type': 'string', 'description': 'The data to write, append, prepend, replace, or insert. Required for 'write', 'append', 'prepend', 'replace', and 'insert_at' operations.', }, 'position': {'type': 'number', 'description': 'The position to insert the data at. Required for 'insert_at' operation.', }, 'target': {'type': 'string', 'description': 'The target path for the 'copy' operation.', }, }, 'required': ['operation']}}}, 'required': ['operations']}, 'output_schema': {'type': 'string', 'description': 'A message indicating the result of the batch file operations.'}},",
        prompt:
          'Examine the source code of the tool and generate a schema for it: ' +
          JSON.stringify(tool),
        model: 'gemini-1.5-flash-001',
      });
      this.emit('text', `Schema created for tool ${tool}:`, schema);
      return schema;
    } catch (error) {
      this.emit('error', `Error creating schema for tool ${tool}:`, error);
      throw error;
    }
  }

  public async addToolSchema(tool: string, schema: any): Promise<boolean> {
    try {
      const toolIndex = this.registryData.tools.findIndex(t => t.name === tool);
      if (toolIndex === -1) {
        this.emit('error', `Tool not found: ${tool}`);
        return false;
      }
      this.registryData.tools[toolIndex].schema = schema;
      this.saveRegistry();
      this.emit('text', `Schema added for tool ${tool}`);
      return true;
    } catch (error) {
      this.emit('error', `Error adding schema to tool ${tool}:`, error);
      return false;
    }
  }

  async addTool(
    name: string,
    source: string,
    schema: any,
    tags: string[]
  ): Promise<boolean> {
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
        execute: async () => {
          return null;
        },
      };
      this.registryData.tools.push(newTool);
      this.saveRegistry();

      await this.saveToolToRepo(name, source, version);
      this.emit('text', `Tool ${name} added successfully.`);
      return true;
    } catch (error) {
      this.emit('error', `Error adding tool ${name}:`, error);
      return false;
    }
  }

  async loadTool(name: string): Promise<string | null> {
    try {
      if (this.loadedTools.has(name)) {
        this.emit('text', `Tool ${name} already loaded.`);
        return null;
      }

      const tool = this.registryData.tools.find(t => t.name === name);
      if (!tool) {
        this.emit('error', `Tool not found: ${name}`);
        return null;
      }

      const toolSource = await this.getToolSourceFromRepo(
        name,
        tool.version
      );
      if (!toolSource) {
        this.emit('error',
          `Source code not found for tool ${name} version ${tool.active}`
        );
        return null;
      }

      this.loadedTools.add(name);
      this.emit('text', `Tool ${name} loaded successfully.`);
      return toolSource;
    } catch (error) {
      this.emit('error', `Error loading tool ${name}:`, error);
      return null;
    }
  }

  async callTool(name: string, params: any): Promise<any> {
    try {
      const tool = this.registryData.tools.find(t => t.name === name);
      if (!tool) {
        this.emit('error', `Tool not found: ${name}`);
        return null;
      }

      const validInput = this.validateToolInput(name, params);
      if (!validInput.valid) {
        this.emit('error',
          `Invalid input for tool ${name}:`,
          validInput.errors
        );
        return null;
      }

      const result = await tool.execute(params, this as any);
      this.emit('text', `Tool ${name} executed successfully.`);
      return result;
    } catch (error) {
      this.emit('error', `Error executing tool ${name}:`, error);
      return null; 
    }
  }

  async updateTool(name: string, source: string): Promise<boolean> {
    try {
      const toolIndex = this.registryData.tools.findIndex(
        t => t.name === name
      );
      if (toolIndex === -1) {
        this.emit('error', `Tool not found: ${name}`);
        return false;
      }

      const tool = this.registryData.tools[toolIndex];
      const newVersion = this.incrementVersion(tool.version);

      tool.version = newVersion;
      tool.source = source;
      tool.active = true;
      this.saveRegistry();

      await this.saveToolToRepo(name, source, newVersion);
      this.emit('text', `Tool ${name} updated to version ${newVersion}.`);
      return true;
    } catch (error) {
      this.emit('error', `Error updating tool ${name}:`, error);
      return false;
    }
  }

  async rollbackTool(name: string, version: string): Promise<boolean> {
    try {
      const toolIndex = this.registryData.tools.findIndex(
        t => t.name === name
      );
      if (toolIndex === -1) {
        this.emit('error', `Tool not found: ${name}`);
        return false;
      }

      const source = await this.getToolSourceFromRepo(name, version);
      if (!source) {
        this.emit('error',
          `Source code not found for tool ${name} version ${version}`
        );
        return false;
      }

      const tool = this.registryData.tools[toolIndex];
      tool.version = version;
      tool.source = source;
      tool.active = true;
      this.saveRegistry();

      await this.git.add([`${name}.ts`]);
      await this.git.commit(`Rollback tool: ${name} to v${version}`);
      this.emit('text',
        `Tool ${name} rolled back to version ${version} successfully.`
      );
      return true;
    } catch (error) {
      this.emit('error', `Error rolling back tool ${name}:`, error);
      return false;
    }
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2]++;
    return parts.join('.');
  }

  async getToolTags(name: string): Promise<string[]> {
    const tool = this.registryData.tools.find(t => t.name === name);
    return tool ? tool.tags || [] : [];
  }

  async getToolVersions(name: string): Promise<string[]> {
    try {
      const log = await this.git.log({ file: `${name}.ts` });
      const versions = log.all
        .map(commit => {
          const match = commit.message.match(/v(\d+\.\d+\.\d+)/);
          return match ? match[1] : null;
        })
        .filter(version => version !== null) as string[];
      return versions;
    } catch (error) {
      this.emit('error', `Error getting versions for tool ${name}:`, error);
      return [];
    }
  }

  async getToolHistory(name: string): Promise<string[]> {
    try {
      const log = await this.git.log({ file: `${name}.ts` });
      return log.all.map(
        commit => `${commit.hash.substr(0, 7)} - ${commit.message}`
      );
    } catch (error) {
      this.emit('error', `Error getting history for tool ${name}:`, error);
      return [];
    }
  }

   validateToolInput(
    toolName: string,
    params: any
  ): { valid: boolean; errors: any[] } {
    const tool = this.tools[toolName];
    if (!tool || !tool.schema) {
      return { valid: true, errors: [] };
    }
    return { valid: true, errors: [] };
  }

  async initialize(): Promise<void> {
    await this.initializeRegistry();
    for (const tool of this.registryData.tools) {
      await this.loadTool(tool.name);
    }
    await this.generateAndRunTests();
  }

  static getInstance(api?: any): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry(api);
      ToolRegistry.instance.initialize();
    }
    return ToolRegistry.instance;
  }

  private async saveToolToRepo(
    name: string,
    source: string,
    version: string
  ): Promise<void> {
    try {
      const filePath = path.join(this.repoPath, `${name}.ts`);
      fs.writeFileSync(filePath, source);
      if (fs.existsSync(path.join(this.repoPath, '.git'))) {
        await this.git.add(filePath);
        await this.git.commit(`Update tool: ${name} v${version}`);
        this.emit('text', `Tool ${name} v${version} saved to repository successfully.`);
      } else {
        this.emit('text', `Tool ${name} v${version} saved to directory. Git repository not initialized yet.`);
      }
    } catch (error) {
      this.emit('error', `Error saving tool ${name} to repository:`, error);
    }
  }

  private async getToolSourceFromRepo(
    name: string,
    version: string
  ): Promise<string | null> {
    try {
      const filePath = path.join(this.repoPath, `${name}.ts`);
      await this.git.checkout([version, filePath]);
      const source = fs.readFileSync(filePath, 'utf8');
      return source;
    } catch (error) {
      this.emit('error', `Error getting tool ${name} from repository:`, error);
      return null;
    }
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
        this.emit('error',
          'Failed to add the generated tool to the registry.'
        );
        return null;
      }
    } catch (error) {
      this.emit('error', 'Error creating tool with LLM:', error);
      return null;
    }
  }

  // New methods for self-testing functionality

  async generateAndRunTests(): Promise<void> {
    for (const tool of this.registryData.tools) {
      if (!tool.testHarness) {
        await this.generateTestHarness(tool);
      }
      await this.runTests(tool);
    }
  }

  private async generateTestHarness(tool: Tool): Promise<void> {
    try {
      const testHarness = await this.callTool('callLLM', {
        system_prompt:
          'You are a test creator. Given a tool\'s source code and schema, create a test harness that verifies the tool\'s functionality.',
        prompt: `Tool Source: ${tool.source}\nSchema: ${JSON.stringify(tool.schema)}`,
        model: 'gemini-1.5-flash-001',
      });

      tool.testHarness = testHarness;
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
      const testFunction = new Function('tool', 'ToolRegistry', tool.testHarness);
      const testResult = await testFunction(tool, this);

      if (testResult.success) {
        this.emit('text', `Tests passed for tool ${tool.name}`);
      } else {
        this.emit('error', `Tests failed for tool ${tool.name}:`, testResult.errors);
      }

      tool.lastTestResult = testResult;
      this.saveRegistry();
    } catch (error) {
      this.emit('error', `Error running tests for tool ${tool.name}:`, error);
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
}

export interface IToolRegistry {
  tools: { [key: string]: Tool };
  schemas: any;
  getToolList(): Promise<Tool[]>;
  createToolSchema(tool: string): Promise<any>;
  addToolSchema(tool: string, schema: any): Promise<boolean>;
  addTool(name: string, source: string, schema: any, tags: string[]): Promise<boolean>;
  loadTool(name: string): Promise<string | null>;
  callTool(name: string, params: any): Promise<any>;
  updateTool(name: string, source: string): Promise<boolean>;
  rollbackTool(name: string, version: string): Promise<boolean>;
  getToolTags(name: string): Promise<string[]>;
  getToolVersions(name: string): Promise<string[]>;
  getToolHistory(name: string): Promise<string[]>;
  validateToolInput(toolName: string, params: any): { valid: boolean; errors: any[] };
  initialize(): Promise<void>;
  createNewToolWithLLM(description: string, schema: any, constraints: string[]): Promise<Tool | null>;
  generateAndRunTests(): Promise<void>;
  improveTools(): Promise<void>;
}

export default ToolRegistry;