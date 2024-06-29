import { EventEmitter } from 'events';
import { ScriptMetadata } from './script/metadataManager';
import ToolRegistry from './toolRegistry';

export class Tool extends EventEmitter {
  public name: string;
  public description: string
  public version: string;
  public source: string;
  public tags: string[];
  public schema: any;
  public active: boolean;
  public testHarness: string;
  public _path: string;
  public lastTestResult: {
    success: boolean;
    message: string;
  } | null;
  public metrics: {
    versions: string[];
    totalUpdates: number;
    lastUpdated: string;
    testResults: {
      totalRuns: number;
      passed: number;
      failed: number;
      lastRun: string | null;
    };
    executionStats: {
      totalExecutions: number;
      averageExecutionTime: number;
      lastExecutionTime: number | null;
      fastestExecutionTime: number;
      slowestExecutionTime: number;
    };
    errorRate: number;
    usageCount: number;
  };
  public metadata: ScriptMetadata;

  constructor(
    private registry: ToolRegistry,
    name: string,
    version: string,
    description: string,
    source: string,
    tags: string[],
    schema: any,
    metadata?: ScriptMetadata
  ) {
    super();
    this.name = name;
    this.version = version;
    this.description = description;
    this.source = source;
    this.tags = tags;
    this.schema = schema;
    this.testHarness = '';
    this.lastTestResult = null;
    this.initializeMetrics();
    this._path = require('path').join(__dirname, `../../tool_repo/${this.name}`);
    this.metadata = metadata || {
      originalQuery: '',
      creationDate: new Date(),
      lastModifiedDate: new Date(),
      author: 'Unknown',
      version: '1.0.0',
      tags: [],
      dependencies: []
    };
  }

  private initializeMetrics(): void {
    this.metrics = {
      versions: [this.version],
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

  executor(): (params: any, api: any) => Promise<any> {
    return async (params: any, api: any) => {
      const toolModule = await import(this.source);
      return await toolModule.default.execute(params, api);
    };
  }

  public saveMetrics(): void {
    this.registry.updateMetrics(this.name, 'version', this.version);
  }

  public async generateTestHarness(): Promise<void> {
    try {
      const messages = [
        {
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

You output RAW Javascript CODE ONLY. Do not include any comments or explanations in the code.`,
        },
        {
          role: 'user',
          content: `Tool Source:\n\n${JSON.stringify(this.source)}\n\nSchema:\n\n${JSON.stringify(this.schema)}\n\n`,
        },
      ];
      const response = await this.registry.conversation.chat(messages);
      this.testHarness = response.content[0].text;
      this.saveTool();
      this.emit('info', `Test harness generated for tool ${this.name}`);
    } catch (error) {
      this.emit('error', `Error generating test harness for tool ${this.name}:`, error);
    }
  }

  public async hardenToolCode(): Promise<void> {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a tool hardener. You take the given Javascript and you harden it if you see any security or execution vulnerabilities. You harden code by:
        - removing any awaiters and other intermediate-output code
        - adding any missing import statements
        - fixing any broken code. 
        - You output only RAW JAVASCRIPT, WITHOUT ANY COMMENTARY, EXPLANATION or FORMATTING.`,
        },
        {
          role: 'user',
          content: this.source,
        },
      ];
      const response = await this.registry.conversation.chat(messages);
      this.source = response.content[0].text;
      this.saveTool();
      this.emit('info', `Tool ${this.name} hardened successfully.`);
    } catch (error) {
      this.emit('error', `Error hardening tool ${this.name}:`, error);
    }
  }

  public async enhanceToolCode(): Promise<void> {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a tool enhancer. You take the given Javascript and you enhance it by:
        - enhancing options and settings
        - adding functionality which will make the tool more useful
        - adding more logging and error handling
        - You output only RAW JAVASCRIPT, WITH COMMENTARY, EXPLANATION and FORMATTING.`,
        },
        {
          role: 'user',
          content: this.source,
        },
      ];
      const response = await this.registry.conversation.chat(messages);
      this.source = response.content[0].text;
      this.saveTool();
      this.emit('info', `Tool ${this.name} enhanced successfully.`);
    } catch (error) {
      this.emit('error', `Error enhancing tool ${this.name}:`, error);
    }
  }

  public async prepareFunction(): Promise<string> {
    try {
      const messages = [
        {
          role: 'system',
          content: `You prepare javascript code for execution. You take the given Javascript and you:
        - fix any broken code
        - remove any awaiters and other intermediate-output code
        - add any missing import statements
        - Do NOT export the function, just return it as a string
        - You output only RAW JAVASCRIPT, WITH COMMENTARY, EXPLANATION and FORMATTING.`,
        },
        {
          role: 'user',
          content: this.source,
        },
      ];
      const response = await this.registry.conversation.chat(messages);
      return response.content[0].text;
    } catch (error) {
      this.emit('error', `Error preparing function for tool ${this.name}:`, error);
      throw error;
    }
  }

  public async runTests(): Promise<void> {
    if (!this.testHarness) {
      this.emit('error', `No test harness found for tool ${this.name}`);
      return;
    }
    try {
      const context = {
        log: (message: string) => this.emit('info', `[${this.name} Test] ${message}`),
        assert: (condition: boolean, message: string) => {
          this.emit('info', `[${this.name} Test] ${message}`);
          if (!condition) {
            throw new Error(message);
          }
        },
      };
      const testHarness = new Function('context', `return ${this.testHarness}`)();
      await testHarness.beforeAll(context);
      for (const key in testHarness) {
        if (key !== 'beforeAll') {
          await testHarness[key](context);
        }
      }

      this.lastTestResult = {
        success: true,
        message: 'All tests passed successfully',
      };

      this.saveTool();
      this.updateMetrics('test', { success: true });
    } catch (error) {
      this.emit('error', `Error running tests for tool ${this.name}:`, error);
      this.lastTestResult = {
        success: false,
        message: `Test failed: ${error.message}`,
      };
      this.updateMetrics('test', { success: false });
    }
  }

  public async saveTool(): Promise<void> {
    try {
      const toolIndex = this.registry.registryData.tools.findIndex(t => t.name === this.name);
      if (toolIndex === -1) {
        this.emit('error', `Tool not found: ${this.name}`);
        return;
      }
      this.registry.registryData.tools[toolIndex] = this;
      this.registry.saveRegistry();
      this.emit('info', `Tool ${this.name} saved successfully.`);
    } catch (error) {
      this.emit('error', `Error saving tool ${this.name}:`, error);
    }
  }

  public async call(params: any, parent: any): Promise<any> {
    try {
      this.updateMetrics('usage', null);
      const startTime = Date.now();
      const result = await this.executor()(params, parent);
      const endTime = Date.now();
      this.updateMetrics('execution', endTime - startTime);
      return result;
    } catch (error) {
      this.updateMetrics('error', true);
      this.emit('error', `Error executing tool ${this.name}:`, error);
      throw error;
    }
  }

  public updateMetrics(updateType: 'version' | 'test' | 'execution' | 'error' | 'usage', data: any): void {
    switch (updateType) {
      case 'version':
        this.metrics.versions.push(data);
        this.metrics.totalUpdates++;
        this.metrics.lastUpdated = new Date().toISOString();
        break;
      case 'test':
        this.metrics.testResults.totalRuns++;
        if (data.success) {
          this.metrics.testResults.passed++;
        } else {
          this.metrics.testResults.failed++;
        }
        this.metrics.testResults.lastRun = new Date().toISOString();
        break;
      case 'execution':
        const executionTime = data;
        this.metrics.executionStats.totalExecutions++;
        this.metrics.executionStats.averageExecutionTime =
          (this.metrics.executionStats.averageExecutionTime * (this.metrics.executionStats.totalExecutions - 1) + executionTime) /
          this.metrics.executionStats.totalExecutions;
        this.metrics.executionStats.lastExecutionTime = executionTime;
        this.metrics.executionStats.fastestExecutionTime = Math.min(this.metrics.executionStats.fastestExecutionTime, executionTime);
        this.metrics.executionStats.slowestExecutionTime = Math.max(this.metrics.executionStats.slowestExecutionTime, executionTime);
        break;
      case 'error':
        this.metrics.errorRate = (this.metrics.errorRate * this.metrics.usageCount + (data ? 1 : 0)) / (this.metrics.usageCount + 1);
        break;
      case 'usage':
        this.metrics.usageCount++;
        break;
    }
    this.saveMetrics();
  }
}