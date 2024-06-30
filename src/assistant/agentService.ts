// agentService.ts

import { ToolRegistry } from './tools/toolRegistry';
import { MemoryService } from './memory/memoryService';
import { ErrorHandlingService } from './logging/errorHandlingService';
import { PromptService } from './prompts/promptService';
import { ConversationService } from './conversation/conversationService';
import { HistoryService } from './history/historyService';
import { ScriptMetadata } from './script/metadataManager';
import { EventEmitter } from 'eventemitter3';
import { loggingService } from './logging/logger';

export class AgentService extends EventEmitter {
  private historyService: HistoryService = new HistoryService();
  private conversation: any;

  constructor(
    private toolRegistry: ToolRegistry,
    private memoryService: MemoryService,
    private errorHandlingService: ErrorHandlingService,
    private promptService: PromptService,
    private conversationService: ConversationService
  ) {
    super();
  }

  async initialize(): Promise<void> {
    loggingService.info('Initializing AgentService...');
    this.conversation = await this.conversationService.conversation;
    await this.toolRegistry.initialize();
    loggingService.info('AgentService initialized successfully.');
  }

  async processCommand(command: string): Promise<any> {
    try {
      loggingService.info(`Processing command: ${command}`);
      this.historyService.saveToHistory(command);

      const analysisResult = await this.promptService.determineTaskTools({
        task: command,
        likelyTools: this.toolRegistry.getCompactRepresentation(),
        relevantMemories: JSON.stringify(await this.memoryService.findSimilarMemories(command))
      });

      loggingService.debug(`Task analysis result: ${JSON.stringify(analysisResult)}`);

      if (analysisResult.useSingleTool) {
        loggingService.info(`Using single tool: ${analysisResult.toolName}`);
        return await this.executeSingleTool(analysisResult.toolName, analysisResult.params);
      } else {
        loggingService.info('Executing multiple tasks');
        return await this.executeMultipleTasks(command, analysisResult);
      }
    } catch (error) {
      loggingService.error('Error processing command', error);
      throw error;
    }
  }

  private async executeSingleTool(toolName: string, params: any): Promise<any> {
    const tool = await this.toolRegistry.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    return await this.errorHandlingService.withRetry(async () => {
      loggingService.debug(`Executing tool: ${toolName}`);
      const result = await this.toolRegistry.callTool(toolName, params);
      loggingService.boxedOutput(`Tool Result:\n${JSON.stringify(result, null, 2)}`);
      return result;
    }, 3, async (error: any) => {
      loggingService.warn(`Error executing tool ${toolName}. Attempting repair...`);
      const repairResult = await this.promptService.repairFailedScriptExecution({
        error,
        toolName,
        params
      });
      if (repairResult.repaired) {
        loggingService.info(`Tool ${toolName} repaired successfully.`);
        await this.toolRegistry.updateTool(toolName, repairResult.source, tool.schema, tool.tags);
      }
      return repairResult;
    });
  }

  private async executeMultipleTasks(command: string, analysisResult: any): Promise<any> {
    if (analysisResult.packages || analysisResult.newTools) {
      await this.setupNewToolsAndPackages(analysisResult);
      return this.processCommand(command);
    }

    const tasks = await this.promptService.generateTasks({
      task: command,
      availableTools: analysisResult.existingTools,
      memories: JSON.stringify(await this.memoryService.findSimilarMemories(command))
    });

    const results = await this.executeTasks(tasks);
    await this.createAndSaveMemory(command, results);
    
    loggingService.boxedOutput(`Task Results:\n${JSON.stringify(results, null, 2)}`);
    return results;
  }

  private async setupNewToolsAndPackages(analysisResult: any): Promise<void> {
    loggingService.info('Setting up new tools and packages');
    if (analysisResult.packages) {
      await this.toolRegistry.installPackages(analysisResult.packages);
    }
    if (analysisResult.newTools) {
      await this.toolRegistry.createTools(analysisResult.newTools);
    }
  }

  private async executeTasks(tasks: any[]): Promise<any[]> {
    const results: any[] = [];
    for (const task of tasks) {
      loggingService.debug(`Executing task: ${task.task}`);
      const result = await this.errorHandlingService.withRetry(async () => {
        return await this.toolRegistry.callTool(task.task, task.params);
      }, 3, async (error: any) => {
        loggingService.warn(`Error executing task ${task.task}. Attempting repair...`);
        return await this.promptService.repairFailedScriptExecution({
          error,
          task: task.task,
          params: task.params
        });
      });
      results.push(result);
    }
    return results;
  }

  private async createAndSaveMemory(command: string, results: any[]): Promise<void> {
    loggingService.debug('Creating and saving memory');
    const memory = this.createFormattedMemory(command, results);
    await this.memoryService.storeMemory(memory.input, memory.response, memory.confidence);
  }

  private createFormattedMemory(command: string, results: any[]): any {
    return {
      input: command,
      response: JSON.stringify(results),
      confidence: 1.0 // You might want to calculate this based on the results
    };
  }

  async improveTools(): Promise<void> {
    loggingService.info('Improving tools');
    await this.toolRegistry.improveTools();
  }

  async analyzeAndCreateToolFromScript(script: string, taskName: string, taskDescription: string): Promise<void> {
    loggingService.info(`Analyzing and creating tool from script: ${taskName}`);
    await this.toolRegistry.analyzeAndCreateToolFromScript(script, taskName, taskDescription);
  }

  async performMaintenance(): Promise<void> {
    loggingService.info('Performing maintenance');
    await this.memoryService.pruneMemories();
    await this.memoryService.consolidateMemories();
    await this.memoryService.refineMemories();
    await this.toolRegistry.cleanupUnusedScripts();
  }

  async getToolMetrics(toolName: string): Promise<any> {
    loggingService.debug(`Retrieving metrics for tool: ${toolName}`);
    return this.toolRegistry.getMetrics(toolName);
  }

  async getAllToolMetrics(): Promise<Map<string, any>> {
    loggingService.debug('Retrieving all tool metrics');
    return this.toolRegistry.getAllMetrics();
  }

  async getToolMetadata(toolName: string): Promise<ScriptMetadata | null> {
    loggingService.debug(`Retrieving metadata for tool: ${toolName}`);
    return this.toolRegistry.getMetadata(toolName);
  }

  async updateToolMetadata(toolName: string, metadata: Partial<ScriptMetadata>): Promise<void> {
    loggingService.debug(`Updating metadata for tool: ${toolName}`);
    await this.toolRegistry.updateMetadata(toolName, metadata);
  }

  async getCommandHistory(): Promise<string[]> {
    loggingService.debug('Retrieving command history');
    return this.historyService.getHistory();
  }
}