import { BlessedUI } from './terminal/blessedUI';
import { AgentService } from './agentService';
import { ToolRegistry } from './tools/toolRegistry';
import { MemoryService } from './memory/memoryService';
import { ErrorHandlingService } from './logging/errorHandlingService';
import { PromptService } from './prompts/promptService';
import { ConversationService } from './conversation/conversationService';
import { MetricsService } from './metrics/metricsService';
import { ChromaClient } from 'chromadb';
import { MaintenanceManager } from './maintenance';
import { loggingService } from './logging/logger';
import { TaskManager } from './tasks/taskManager';
import chalk from 'chalk';

class Application {
  private agentService: AgentService;
  private maintenanceManager: MaintenanceManager;
  private metricsService: MetricsService;
  private taskManager: TaskManager;
  private toolRegistry: ToolRegistry;
  private memoryService: MemoryService;
  private promptService: PromptService;
  private conversationService: ConversationService;


  private ui: BlessedUI;

  constructor() {
    const chromaClient = new ChromaClient();
    this.metricsService = new MetricsService();
    this.conversationService = new ConversationService('claude');
    this.toolRegistry = new ToolRegistry(this.metricsService, this.conversationService);
    this.promptService = new PromptService(this.conversationService, this.toolRegistry, this.memoryService);
    this.toolRegistry = new ToolRegistry(this.metricsService, this.conversationService);
    this.memoryService = new MemoryService(chromaClient);
    const errorHandlingService = new ErrorHandlingService(this.promptService, this.toolRegistry);
    this.ui = new BlessedUI();

    this.agentService = new AgentService(
      this.toolRegistry,
      this.memoryService,
      errorHandlingService,
      this.promptService,
      this.conversationService,
      this.ui
    );

    this.maintenanceManager = new MaintenanceManager(
      this.agentService, 
      this.toolRegistry, 
      this.memoryService
    );

    this.taskManager = new TaskManager();
    
    this.setupUIEventHandlers();
    this.setupSignalHandlers();
  }

  private setupUIEventHandlers(): void {
    this.ui.on('command', async (command: string) => {
      if (command.toLowerCase() === 'exit') {
        this.ui.exit();
        return;
      }
      
      if (command.toLowerCase() === 'help') {
        this.showHelp();
        return;
      }

      try {
        this.ui.updateStatus('Processing command...');
        
        const result = await this.taskManager.runTask(() => this.processUserInput(command));
        
        if (result !== undefined) {
          // if there are \n in the result then json.parse it and print it in a table
          try {
            const parsedResult = JSON.parse(result);
            this.ui.addToOutput(parsedResult);
          } catch (error) {
            this.ui.addToOutput(result);
          }
        } else {
          this.ui.addToOutput(chalk.yellow('Command processed successfully, but no output was returned.'));
        }
        
        this.updateMetrics();
      } catch (error) {
        this.ui.addToOutput(chalk.red(`Error: ${error.message}`));
      } finally {
        this.ui.updateStatus('Ready');
      }
    });

    this.ui.on('cancelTask', () => {
      if (this.taskManager.isTaskRunning()) {
        this.taskManager.cancelCurrentTask();
      }
    });

    this.taskManager.on('taskCancelled', () => {
      this.ui.addToOutput(chalk.yellow('Task cancelled. Ready for new input.'));
      this.ui.updateStatus('Ready');
    });
  }

  private setupSignalHandlers(): void {
    process.on('SIGINT', () => {
      if (this.taskManager.isTaskRunning()) {
        this.taskManager.cancelCurrentTask();
      } else {
        this.ui.exit();
      }
    });
}
  async initialize(): Promise<void> {
    this.ui.updateStatus('Initializing application...');
    await this.agentService.initialize();
    this.setupMaintenanceSchedule();
    this.ui.updateStatus('Application initialized successfully.');
    this.ui.addToOutput(chalk.cyan('Welcome to the Enhanced AI Assistant!'));
    this.ui.addToOutput(chalk.cyan('Type a command below or "help" for assistance.'));
    await this.updateMetrics();
    this.ui.focusInput();
  }

  private setupMaintenanceSchedule(): void {
    setInterval(() => {
      this.ui.updateStatus('Performing maintenance...');
      this.maintenanceManager.performMaintenance({}).catch(error => {
        this.ui.addToOutput(chalk.red('Error during maintenance: ' + error.message));
      }).finally(() => {
        this.ui.updateStatus('Ready');
      });
    }, 24 * 60 * 60 * 1000); // Run every 24 hours
  }

  private async processUserInput(input: string): Promise<any> {
    this.ui.addToOutput(chalk.blue('User: ') + input);
    return await this.agentService.processCommand(input);
  }

  private async updateMetrics(): Promise<void> {
    const metrics = await this.metricsService.getRecentMetrics();
    const metricsDisplay = Object.entries(metrics)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    this.ui.addToOutput('Recent Metrics:\n' + metricsDisplay);
  }

  private showHelp(): void {
    const helpText = `
Available Commands:
- help: Show this help message
- exit: Exit the application
- history: Show command history
- metrics: Show detailed metrics
- tools: List available tools
- maintenance: Run maintenance tasks
    `;
    this.ui.addToOutput(chalk.cyan(helpText));
  }

  async getCommandHistory(): Promise<string[]> {
    return this.agentService.getCommandHistory();
  }

  async getToolMetrics(toolName: string): Promise<any> {
    return await this.agentService.getToolMetrics(toolName);
  }

  async getAllToolMetrics(): Promise<Map<string, any>> {
    return await this.agentService.getAllToolMetrics();
  }

  async getToolMetadata(toolName: string): Promise<any> {
    return await this.agentService.getToolMetadata(toolName);
  }

  async runMaintenance(): Promise<void> {
    this.ui.updateStatus('Running maintenance tasks...');
    await this.maintenanceManager.performMaintenance({});
    this.ui.updateStatus('Maintenance completed');
    this.ui.addToOutput(chalk.green('Maintenance tasks completed successfully.'));
  }

  async listTools(): Promise<void> {
    const tools = this.toolRegistry.listTools();
    const toolList = tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n');
    this.ui.addToOutput(chalk.cyan('Available Tools:\n' + toolList));
  }
}




// Create and run the application
const runApp = async () => {
  const app = new Application();
  try {
    await app.initialize();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

// Run the application
runApp();