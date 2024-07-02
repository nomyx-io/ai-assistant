import { ToolRegistry } from './tools/toolRegistry';
import { MemoryService } from './memory/memoryService';
import { ErrorHandlingService } from './logging/errorHandlingService';
import { AIReviewResult, PromptService } from './prompts/promptService';
import { ConversationService } from './conversation/conversationService';
import { HistoryService } from './history/historyService';
import { ScriptMetadata } from './script/metadataManager';
import { EventEmitter } from 'eventemitter3';
import { loggingService } from './logging/logger';
import { BlessedUI } from './terminal/blessedUI';
import { StateObject } from './state';
import { Task, TaskManager } from './tasks/taskManager';

export class AgentService extends EventEmitter {
  private historyService: HistoryService = new HistoryService();
  private conversation: any;
  private taskManager: TaskManager = new TaskManager();

  constructor(
    private toolRegistry: ToolRegistry,
    private memoryService: MemoryService,
    private errorHandlingService: ErrorHandlingService,
    private promptService: PromptService,
    private conversationService: ConversationService,
    private ui: BlessedUI
  ) {
    super();
    this.taskManager.on('taskCancelled', () => {
      this.ui.log('Task cancelled');
      this.ui.updateSpinner('Task cancelled');
    });
    this.taskManager.on('cancellingTask', () => {
      this.ui.log('Cancelling task...');
      this.ui.updateSpinner('Cancelling task...');
    });
  }

  async initialize(): Promise<void> {
    loggingService.info('Initializing AgentService...');
    this.conversation = await this.conversationService.conversation;
    await this.toolRegistry.initialize();
    loggingService.info('AgentService initialized successfully.');
  }

  async processCommand(command: string): Promise<any> {
    return this.taskManager.runTask(async () => {
      this.ui.startSpinner();
      try {
        this.historyService.saveToHistory(command);
        this.ui.updateSpinner(command);
        this.ui.log(command);
    
        let state: StateObject = {
          originalGoal: command,
          progress: [],
          workProducts: [],
          notes: [],
          isComplete: false,
          currentTaskIndex: 0,
          tasks: [],
          completedTasks: [],
          state: {}
        };
    
        const similarMemories = await this.memoryService.findSimilarMemories(command);
        const { existingTools, newTools, packages } = await this.promptService.determineTaskTools({
          task: command,
          likelyTools: this.toolRegistry.getCompactRepresentation(),
          relevantMemories: JSON.stringify(similarMemories),
          state: state
        });
    
        state.progress.push(`Determined tools: Existing - ${existingTools.join(', ')}, New - ${newTools.join(', ')}`);
        this.ui.log(`Determined tools: Existing - ${existingTools.join(', ')}, New - ${newTools.join(', ')}`);
    
        if (packages.length > 0) {
          await this.toolRegistry.installPackages(packages);
          state.progress.push(`Installed packages: ${packages.join(', ')}`);
          this.ui.log(`Installed packages: ${packages.join(', ')}`);
        }
    
        if (newTools.length > 0) {
          for (const newTool of newTools) {
            const [toolName, toolDescription] = newTool.split(':');
            const toolDetails = await this.promptService.generateTool({
              toolName,
              description: toolDescription,
              task: command
            });
            await this.toolRegistry.createTools([toolDetails]);
            state.progress.push(`Created new tool: ${toolName}`);
            this.ui.log(`Created new tool: ${toolName}`);
          }
        }
    
        const plan: Task[] = await this.promptService.createExecutionPlan(command, similarMemories);
        state.tasks = plan;
    
        state.progress.push(`Created execution plan with ${plan.length} tasks`);
        this.ui.log(`Created execution plan with ${plan.length} tasks`);
    
        this.updateTaskList(state.tasks);
    
        while (!state.isComplete && state.currentTaskIndex < state.tasks.length) {
          const currentTask: Task = state.tasks[state.currentTaskIndex];
          state.progress.push(currentTask.description || currentTask.name);
          this.ui.updateSpinner(`Executing task: \`${currentTask.name} ${JSON.stringify(currentTask.params)}\``);
          this.highlightCurrentTask(state.currentTaskIndex);
    
          try {
            state = await this.executeTask(currentTask, state);
          } catch (error) {
            if (currentTask.errorHandling) {
              const fixedTask = await this.errorHandlingService.attemptToFix(error, currentTask);
              if (fixedTask) {
                state.tasks[state.currentTaskIndex] = {
                  ...fixedTask,
                  params: currentTask.params,
                  name: currentTask.name
                }
                state.progress.push(`Fixed task: ${currentTask.name}`);
                this.ui.log(`Fixed task: ${currentTask.name}`);
                continue;
              }
            }
            throw error;
          }
    
          state.currentTaskIndex++;
        }
    
        await this.createAndSaveMemory(command, state.workProducts);
        await this.toolRegistry.improveTools();
        await this.performMaintenance();
    
        return state.workProducts;
      } catch (error) {
        if (error.message === 'Task cancelled') {
          this.ui.log('Command processing cancelled');
          this.ui.updateSpinner('Command processing cancelled');
          return { status: 'cancelled' };
        }
        this.ui.log(`Error processing command: ${error.message}`);
        this.ui.updateSpinner('Error processing command');
        throw error;
      } finally {
        this.ui.stopSpinner();
        this.updateTaskList([]);
      }
    });
  }

  private updateTaskList(tasks: any[]): void {
    const taskNames = tasks.map(task => task.name);
    this.ui.updateTasks(taskNames);
  }

  private highlightCurrentTask(index: number): void {
    this.ui.highlightTask(index);
  }

  private async executeTask(task: Task, state: StateObject): Promise<StateObject> {
    try {
      if (this.taskManager.isCancelling) {
        throw new Error('Task cancelled');
      }

      const [result, updatedState] = await this.errorHandlingService.withRetry(async (repairedValues: any) => {
        if (repairedValues.repaired) {
          loggingService.info(`Tool ${task.name} repaired successfully.`);
          this.ui.log(`Tool ${task.name} repaired successfully.`);
          const tool = await this.toolRegistry.getTool(task.name);
          if (tool) {
            await this.toolRegistry.updateTool(task.name, repairedValues.source, tool.schema, tool.tags);
          }
        }
    
        loggingService.debug(`Executing task: \`${task.name} ${JSON.stringify(task.params)}\``);
        this.ui.log(`Executing task: \`${task.name} ${JSON.stringify(task.params)}\``);
        return await this.toolRegistry.callTool(task.name, task.params, state);
      }, 3, async (error: any) => {
        if (error.message === 'Task cancelled') {
          throw error;
        }
        loggingService.warn(`Error executing task ${task.name}. Attempting repair...`);
        this.ui.log(`Error executing task ${task.name}. Attempting repair...`);
        const ret = await this.promptService.repairFailedScriptExecution({
          error,
          task: task.name,
          params: task.params
        });
        return [ret, state];
      });
    
      if (typeof result === 'string') {
        state.progress.push(result);
        this.ui.log(result);
      } else if (result && result.response) {
        state.progress.push(result.response);
        this.ui.log(result.response);
      }
    
      state.workProducts.push(JSON.stringify(result));
    
      let aiReview: any = await this.promptService.reviewTaskExecution({
        originalTask: state.originalGoal,
        lastExecutedSubtask: task,
        subtaskResults: result,
        currentState: state,
      });
      aiReview = JSON.parse(aiReview.content[0].text);
    
      state.progress.push(aiReview.explanation);
      this.ui.log(aiReview.explanation);
    
      state = { ...state, ...aiReview.stateUpdates };
    
      if (aiReview.nextAction === 'modify_plan') {
        state.tasks.splice(state.currentTaskIndex + 1, 0, ...aiReview.additionalTasks);
      } else if (aiReview.nextAction === 'complete') {
        state.isComplete = true;
      }
    
      state.completedTasks.push(task);
    
      return state;
    } catch (error) {
      this.ui.log(`Error executing task ${task.name}: ${error.message}`);
      throw error;
    }
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
      confidence: 1.0
    };
  }

  async improveTools(): Promise<void> {
    loggingService.info('Improving tools');
    this.ui.updateSpinner('Improving tools...');
    await this.toolRegistry.improveTools();
  }

  async analyzeAndCreateToolFromScript(script: string, taskName: string, taskDescription: string): Promise<void> {
    loggingService.info(`Analyzing and creating tool from script: ${taskName}`);
    this.ui.updateSpinner(`Analyzing and creating tool from script: ${taskName}`);
    await this.toolRegistry.analyzeAndCreateToolFromScript(script, taskName, taskDescription);
  }

  async performMaintenance(): Promise<void> {
    loggingService.info('Performing maintenance');
    this.ui.updateSpinner('Performing maintenance...');
    await this.memoryService.pruneMemories();
    await this.memoryService.consolidateMemories();
    await this.memoryService.refineMemories();
    await this.toolRegistry.cleanupUnusedScripts();
  }

  async getToolMetrics(toolName: string): Promise<any> {
    loggingService.debug(`Retrieving metrics for tool: ${toolName}`);
    this.ui.updateSpinner(`Retrieving metrics for tool: ${toolName}`);
    return this.toolRegistry.getMetrics(toolName);
  }

  async getAllToolMetrics(): Promise<Map<string, any>> {
    loggingService.debug('Retrieving all tool metrics');
    this.ui.updateSpinner('Retrieving all tool metrics');
    return this.toolRegistry.getAllMetrics();
  }

  async getToolMetadata(toolName: string): Promise<ScriptMetadata | null> {
    loggingService.debug(`Retrieving metadata for tool: ${toolName}`);
    this.ui.updateSpinner(`Retrieving metadata for tool: ${toolName}`);
    return this.toolRegistry.getMetadata(toolName);
  }

  async updateToolMetadata(toolName: string, metadata: Partial<ScriptMetadata>): Promise<void> {
    loggingService.debug(`Updating metadata for tool: ${toolName}`);
    this.ui.updateSpinner(`Updating metadata for tool: ${toolName}`);
    await this.toolRegistry.updateMetadata(toolName, metadata);
  }

  async getCommandHistory(): Promise<string[]> {
    loggingService.debug('Retrieving command history');
    this.ui.updateSpinner('Retrieving command history');
    return this.historyService.getHistory();
  }

  cancelCurrentTask(): void {
    this.taskManager.cancelCurrentTask();
  }

  isTaskRunning(): boolean {
    return this.taskManager.isTaskRunning();
  }

  async getActiveTasks(): Promise<Task[]> {
    return this.taskManager.getActiveTasks();
  }

  async getActiveTask(): Promise<Task | null> {
    return this.taskManager.getActiveTask();
  }
}
