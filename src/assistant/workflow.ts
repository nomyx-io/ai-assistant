
import chalk from 'chalk';

import Assistant from './assistant';
import { MemoryRefiner } from './memory/refiner';
import { MemoryConsolidator } from './memory/consolidator';
import { MemoryPruner } from './memory/pruner';

export interface WorkflowResult {
  success: boolean;
  data?: any;
  error?: Error;
}

export class CoreWorkflow extends Assistant {

  private memoryRefiner: MemoryRefiner;
  private memoryConsolidator: MemoryConsolidator;
  private memoryPruner: MemoryPruner;
  private lastMemoryMaintenanceTime: number;

  constructor(public toolRegistry: any, chromaClient: any) {
    super(toolRegistry, chromaClient);
    this.memoryRefiner = new MemoryRefiner();
    this.memoryConsolidator = new MemoryConsolidator(chromaClient);
    this.memoryPruner = new MemoryPruner();
    this.lastMemoryMaintenanceTime = Date.now();
  }

  async execute(input: string): Promise<WorkflowResult> {
    try {
      if (input.startsWith('.')) {
        await this.executeSpecialCommand(input);
        return { success: true };
      }
      //this.setupHandlers();
      this.history.push(input);
      this.working = true;

      // Existing execute logic
      const result = await this.callAgent(input);

      // Periodically perform memory maintenance
      if (this.shouldPerformMemoryMaintenance()) {
        await this.performMemoryMaintenance();
      }

      // if result is already a WorkflowResult, return it
      if (result.success !== undefined) {
        return result;
      }

      return { success: true, data: result };
    } catch (error) {
      console.log(chalk.bold.red(error.message));
      return await this.handleError(error, input);
    } finally {
      this.removeAllListeners();
      this.working = false;
      this.emit('show-prompt');
    }
  }

  private shouldPerformMemoryMaintenance(): boolean {
    const MAINTENANCE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    return Date.now() - this.lastMemoryMaintenanceTime > MAINTENANCE_INTERVAL;
  }

  private async performMemoryMaintenance(): Promise<void> {
    await this.memoryRefiner.refineMemories(this.memoryStore);
    await this.memoryConsolidator.consolidateMemories(this.memoryStore);
    await this.memoryPruner.pruneMemories(this.memoryStore);
    this.lastMemoryMaintenanceTime = Date.now();
  }

  setupHandlers() {
    this.on('taskId', (taskid: any) => {
      this.on(`${taskid}_task`, (chat: any) => {
        this.removeListener(`${taskid}_task`);
      });
      this.on(`${taskid}_chat`, (chat: any) => {
        this.removeListener(`${taskid}_chat`);
      });
      this.on(`${taskid}_script`, (script: any) => {
        console.log(chalk.bold.blue('Script: ' + script));
        this.removeListener(`${taskid}_script`);
      });
      this.on(`${taskid}_results`, async (result: any) => {
        this.removeListener(`${taskid}_results`);
        //console.log(chalk.bold.magenta(JSON.stringify(result, null, 2)) + '\n')
        
      });
      this.on('tool_update', (data: any) => {
        console.log(chalk.bold.cyan(`Tool '${data.name}' updated to version ${data.version}`));
      });

      this.on('tool_rollback', (data: any) => {
        console.log(chalk.bold.cyan(`Tool '${data.name}' rolled back to version ${data.version}`));
      });
    });
    this.on('text', (error: any) => {
      this.debug && console.log(chalk.italic.gray(error));
    });
    this.on('error', (error: any) => {
      console.log(chalk.bold.red(error));
    });
  }

  async executeSpecialCommand(command: string) {
    switch (command) {
      case '.help':
        this.showHelp();
        break;
      case '.debug':
        this.toggleDebug();
        break;
      case '.history':
        this.printHistory();
        break;
      default:
        console.log(`Unknown command: ${command}`);
    }
  }

  restoreSessionState() {
    // Restore the saved output and print it to the console
    process.stdout.write(this.savedOutput);
    this.printHistory();
  }

  showHelp() {
    console.log("Commands:");
    console.log("  .help\t\tShow this help message");
    console.log("  .debug\t\tToggle debug mode on/off");
    console.log("  .history\tShow command history for this session");
    console.log("  .state\t\tShow current state of the session");
    console.log("  .exit\t\tExit this session");
    console.log("  Ctrl+A\t\tCreate a new session");
    console.log("  Ctrl+C\t\tSwitch to the next session");
  }

  toggleDebug() {
    this.debug = !this.debug;
    console.log(`Debug mode is now ${this.debug ? 'on' : 'off'}`);
  }

  printHistory() {
    if (this.history.length === 0) {
      console.log('This session has no history yet.');
      return;
    }
    console.log(`Session History:`);
    this.history.forEach((command, index) => {
      console.log(`${index + 1}. ${command}`);
    });
  }

  private async handleError(error: Error, context: string): Promise<WorkflowResult> {
    const errorPrompt = `An error occurred during execution. Analyze the error and context, then respond with either:
1. A modified script to retry the operation, or
2. Instructions to update a tool if it's a tooling problem.

Error: ${error.message}
Context: ${context}

Respond in JSON format:
{
  "action": "retry" | "update_tool",
  "data": "<modified script>" | { "toolName": "<name>", "updatedSource": "<source>" }
}`;

    let response = await this.conversation.chat([
      { role: 'system', content: errorPrompt },
      { role: 'user', content: JSON.stringify({ error: error.message, context }) }
    ]);
    response = response.replace(/.*```json/g, '');
    response = response.replace(/.*```/g, '');
    response = response.replace(/[\r\n]+/g, '');
    let resolution = JSON.parse(response);
    if (resolution.action === 'retry') {
      return await this.execute(resolution.data);
    } else if (resolution.action === 'update_tool') {
      await this.updateTool(resolution.data.toolName, resolution.data.updatedSource);
      return await this.execute(context);
    } else {
      return { success: false, error: new Error('Unable to resolve the error') };
    }
  }

  async updateTool(name: string, source: string): Promise<boolean> {
    const updated = await this.toolRegistry.updateTool(name, source);
    if (updated) {
      super.emit('toolUpdated', { name, source });
    } else {
      throw new Error(`Failed to update tool: ${name}`);
    }
    return updated;
  }

}