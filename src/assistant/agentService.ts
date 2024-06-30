// agentService.ts
import { ToolRegistry } from './tools/toolRegistry';
import { MemoryService } from './memory/memoryService';
import { ErrorHandlingService } from './logging/errorHandlingService';
import { PromptService } from './prompts/promptService';
import { ConversationService } from './conversation/conversationService';
import { HistoryService } from './history/historyService';
import { ScriptMetadata } from './script/metadataManager';
import { EventEmitter } from 'eventemitter3';

export class AgentService extends EventEmitter {
  private historyService: HistoryService = new HistoryService();

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
    await this.toolRegistry.initialize();
  }

  async processCommand(command: string): Promise<any> {
    try {
      // Step 1: Save to history
      this.historyService.saveToHistory(command);

      // Step 2: Analyze request prompt
      const {
        existingTools,
        newTools,
        packages,
        useSingleTool,
        toolName,
        params
      } = await this.promptService.determineTaskTools({
        task: command,
        likelyTools: this.toolRegistry.getCompactRepresentation(),
        relevantMemories: JSON.stringify(await this.memoryService.findSimilarMemories(command))
      });

      // Step 3: Get memory
      const similarMemories = await this.memoryService.findSimilarMemories(command);

      if (useSingleTool) {
        let tool = await this.toolRegistry.getTool(toolName);
        if (!tool) {
          throw new Error(`Tool not found: ${toolName}`);
        }
        let repairedTool, hasRepaired = false;
        return await this.errorHandlingService.withRetry(async (repairedValues: any) => {
          if(repairedValues.repaired) {
            let { reason, name, source } = repairedValues;
            repairedTool = name;
            await this.toolRegistry.updateTool(toolName, source, tool.schema, tool.tags, tool.metadata);
            hasRepaired = true;
          }
          const vv = await this.toolRegistry.callTool(toolName, params);
          return vv
        }, 3, async (error: any) => {
          let ret = await this.promptService.repairFailedScriptExecution({error, chat: command, toolName, params});
          ret = await tool.execute(params);
          return ret;
        });
      } else {
        if (packages || newTools) {
          // Handle package installation and new tool creation
          await this.installPackages(packages);
          await this.createTools(newTools);
          return this.processCommand(command); // Recursive call after setup
        } else {
          // Decompose command into tasks
          const tasks = await this.promptService.generateTasks({
            task: command,
            availableTools: existingTools,
            memories: JSON.stringify(similarMemories)
          });

          // Execute tasks
          const results = await this.executeTasks(tasks);

          // Create and save memory
          const memory = this.createFormattedMemory(command, results, similarMemories);
          await this.memoryService.storeMemory(memory, JSON.stringify(results), 1.0); // Assuming high confidence for now

          return results;
        }
      }
    } catch (error) {
      console.error('Error processing command:', error);
      throw error;
    }
  }

  private async installPackages(packages: string[]): Promise<void> {
    // forward the request to the tool registry
    await this.toolRegistry.installPackages(packages);
  }

  private async createTools(tools: any[]): Promise<void> {
    // forward the request to the tool registry
    await this.toolRegistry.createTools(tools);
  }  

  private async executeTasks(tasks: any[], maxRetries: number = 3): Promise<any[]> {
    const results: any[] = [];
    let toolName = '', sourceCode = '', tool;
    for (let { task, source, chat, params } of tasks) {
      const [taskName] = toolName ? [toolName + ':' + 'Automatically fixing issue'] : task.split(':');
      sourceCode = source;
      const taskResult = await this.errorHandlingService.withRetry(async (repairedValues: any) => {
        if(repairedValues) {
          const { repaired, reason, name, source } = repairedValues;
          this.emit('chat', `Tool '${name}' repaired. Reason: ${reason}`);
          if(repaired) {
            toolName = name;
            sourceCode = source;
            await this.toolRegistry.addTool(toolName, source, tool.schema, tool.tags, tool.metadata);
          }
        }
        tool = await this.toolRegistry.getTool(taskName);
        if (!tool) {
          throw new Error(`Tool not found: ${taskName}`);
        }
        return await tool.execute(params);
      }, maxRetries, async (error: any) => {
        return await this.promptService.repairFailedScriptExecution({error, chat, source: sourceCode, task});
      });
      results.push(taskResult);
    }
    return results;
  }

  private createFormattedMemory(command: string, results: any[], similarMemories: any[]): any {
    // Implement memory formatting logic here
    // This could involve combining the command, results, and similar memories
    // into a structured format for storage
    return {
      command,
      results,
      relatedMemories: similarMemories
    };
  }

  async improveTools(): Promise<void> {
    await this.toolRegistry.improveTools();
  }

  async analyzeAndCreateToolFromScript(script: string, taskName: string, taskDescription: string): Promise<void> {
    await this.toolRegistry.analyzeAndCreateToolFromScript(script, taskName, taskDescription);
  }

  async performMaintenance(): Promise<void> {
    await this.memoryService.pruneMemories();
    await this.memoryService.consolidateMemories();
    await this.memoryService.refineMemories();
    await this.toolRegistry.cleanupUnusedScripts();
  }

  async getToolMetrics(toolName: string): Promise<any> {
    return this.toolRegistry.getMetrics(toolName);
  }

  async getAllToolMetrics(): Promise<Map<string, any>> {
    return this.toolRegistry.getAllMetrics();
  }

  async getToolMetadata(toolName: string): Promise<ScriptMetadata | null> {
    return this.toolRegistry.getMetadata(toolName);
  }

  async updateToolMetadata(toolName: string, metadata: Partial<ScriptMetadata>): Promise<void> {
    await this.toolRegistry.updateMetadata(toolName, metadata);
  }

  async getCommandHistory(): Promise<string[]> {
    return this.historyService.getHistory();
  }

}