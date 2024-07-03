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

  // process command takes a request and returns a response
  async processCommand(command: string): Promise<any> {

    return this.taskManager.runTask(async () => {
      this.ui.startSpinner();
      try {
        // save the command to history
        this.historyService.saveToHistory(command);
        this.ui.updateSpinner(command);
        this.ui.log(command);
        
        // create a new state object for the command
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
        
        // find similar memories of the command
        const similarMemories = await this.memoryService.findSimilarMemories(command);

        // determine the tools needed to execute the command
        const { 
          existingTools, 
          newTools, 
          packages, 
          rationale, 
          useSingleTool, 
          toolName, 
          params } = await this.promptService.determineTaskTools({
          task: command,
          availableTools: this.toolRegistry.getCompactRepresentation(),
          relevantMemories: JSON.stringify(similarMemories),
          state: state
        });
        
        this.ui.log(rationale);
        
        // install packages if needed
        if (packages.length > 0) {
          this.ui.log(`Installing packages: ${packages.join(', ')}`);
          await this.toolRegistry.installPackages(packages);
          state.progress.push(`Installed packages: ${packages.join(', ')}`);
          this.ui.log(`Installed packages: ${packages.join(', ')}`);
        }
    
        // generate new tools if needed
        const newToolsOut: any[] = [];
        if (newTools.length > 0) {
          for (const newTool of newTools) {
            this.ui.log(`Creating new tool: ${newTool}`);
            const [toolName, toolDescription] = newTool.split(':');
            const {
              tool, description, commentaries, methodSignature, script, packages
            } = await this.promptService.generateTool({
              description: toolDescription,
              task: command
            });
            newToolsOut.push({
              name: toolName,
              description: description,
              commentaries: commentaries,
              methodSignature: methodSignature,
              script: script,
            });
          }
          await this.toolRegistry.createTools(newToolsOut);
          state.progress.push(`Created new tool: ${newToolsOut.join(', ')}`);
          this.ui.log(`Created new tool: ${newToolsOut.join(', ')}`);
        }

        // if task is serviceable by a single tool, use it
        if(useSingleTool) {
          const tool = await this.toolRegistry.getTool(toolName);
          if(tool) {
            state.tasks = [{
              name: toolName,
              params: params,
              description: rationale
            }];

            state.progress.push(`Using: ${toolName}`);
            this.ui.log(`Using: ${toolName}`);

            state = (await this.executeTask(state.tasks[0], state))[1];
            state.isComplete = true;

            await this.createAndSaveMemory(command, state.workProducts);
            await this.toolRegistry.improveTools();
            await this.performMaintenance();

            // set focus on the input box
            this.ui.focusInput();

            return state.workProducts;
          }
        }
        
        // create an execution plan
        const plan: {
          explanation: string,
          tasks: {
            name: string,
            params: {},
            description: string,
            errorHandling: string,
            callback: boolean,
            script: string
          }[]
        } = await this.promptService.createExecutionPlan(
          command, 
          similarMemories,
          rationale,
          [...existingTools, ...newTools],
          state
        );

        // set the plan
        state.tasks = plan.tasks.map(task => {
          return {
            name: task.name,
            params: task.params,
            description: task.description,
            errorHandling: task.errorHandling,
            callback: task.callback,
            script: task.script
          };
        });

        state.progress.push(plan.explanation);
        this.ui.log(plan.explanation);
        this.updateTaskList(state.tasks);
    
        while (!state.isComplete && state.currentTaskIndex < state.tasks.length) {

          const currentTask: Task = state.tasks[state.currentTaskIndex];
          
          state.progress.push(currentTask.description || currentTask.name);
          this.ui.updateSpinner(`Executing task: \`${currentTask.name} ${JSON.stringify(currentTask.params)}\``);

          // highlight the current task in the UI
          this.highlightCurrentTask(state.currentTaskIndex);
    
          try {
            state = (await this.executeTask(currentTask, state))[1];
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

        // set focus on the input box
        this.ui.focusInput();
    
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
    this.ui.render();
  }

  private highlightCurrentTask(index: number): void {
    this.ui.highlightTask(index);
  }

  private async executeTask(task: Task, state: StateObject): Promise<[any, StateObject]> {
    try {
      if (this.taskManager.isCancelling) {
        throw new Error('Task cancelled');
      }

      const [result, updatedState] = await this.errorHandlingService.withRetry(async (repairedValues: any) => {
        const [result, newstate] = repairedValues && repairedValues.length > 0 ? repairedValues.state : [null, {}];
        if (result && result.repaired) {
          loggingService.info(`Tool ${task.name} repaired successfully.`);
          this.ui.log(`Tool ${task.name} repaired successfully.`);
          const memory = await this.createFormattedMemory(`I encountered an error while executing the task ${task.name}. The error message was ${repairedValues.error.message}. I attempted to repair the tool and it was successful.`, []);
          await this.memoryService.storeMemory(memory.input, memory.response, memory.confidence);
          const tool = await this.toolRegistry.getTool(task.name);
          if (tool) {
            await this.toolRegistry.updateTool(task.name, repairedValues.source, tool.schema, tool.tags);
            this.ui.log(`Tool ${task.name} updated successfully.`);
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
        const memories = await this.memoryService.findSimilarMemories(`I encountered an error while executing the task ${task.name}. The error message is: ${error.message}`);
        const ret = await this.promptService.repairFailedScriptExecution({
          error,
          task: task.name,
          params: await task.params,
          source: await this.toolRegistry.getToolSource(task.name),
          availableTools: this.toolRegistry.getCompactRepresentation(),
          memories: memories,
          state: state
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
    
      return [result, state];
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
