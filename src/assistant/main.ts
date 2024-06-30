// main.ts
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
import { EnhancedUI } from './terminal/ui';

class Application {
  private agentService: AgentService;
  private maintenanceManager: MaintenanceManager;
  private metricsService: MetricsService;
  private ui: EnhancedUI;

  constructor() {
    this.ui = new EnhancedUI();
    const chromaClient = new ChromaClient();
    this.metricsService = new MetricsService();
    const conversationService = new ConversationService('claude');
    const toolRegistry = new ToolRegistry(this.metricsService, conversationService);
    const memoryService = new MemoryService(chromaClient);
    const errorHandlingService = new ErrorHandlingService();
    const promptService = new PromptService(conversationService, toolRegistry);

    this.agentService = new AgentService(
      toolRegistry,
      memoryService,
      errorHandlingService,
      promptService,
      conversationService
    );

    this.maintenanceManager = new MaintenanceManager(
      this.agentService, 
      toolRegistry, 
      memoryService
    );

    this.setupUIEventHandlers();
  }

  private setupUIEventHandlers(): void {
    this.ui.on('command', async (command: string) => {
      if (command.toLowerCase() === 'exit') {
        this.ui.close();
        return;
      }
      try {
        const result = await this.processUserInput(command);
        if (result !== undefined) {
          this.ui.updateOutput(JSON.stringify(result, null, 2), 'info');
        } else {
          this.ui.updateOutput('Command processed successfully, but no output was returned.', 'info');
        }
      } catch (error) {
        this.ui.updateOutput(`Error: ${error.message}`, 'error');
      }
    });
  }

  async initialize(): Promise<void> {
    loggingService.info('Initializing application...');
    await this.agentService.initialize();
    this.setupMaintenanceSchedule();
    loggingService.info('Application initialized successfully.');
    this.ui.displayWelcomeMessage();
  }

  private setupMaintenanceSchedule(): void {
    loggingService.debug('Setting up maintenance schedule...');
    setInterval(() => {
      this.maintenanceManager.performMaintenance().catch(error => {
        loggingService.error('Error during maintenance', error);
      });
    }, 24 * 60 * 60 * 1000);
    loggingService.debug('Maintenance schedule set up.');
  }

  async getMetricsReport(): Promise<string> {
    loggingService.debug('Generating metrics report...');
    return this.metricsService.generateReport();
  }

  async processUserInput(input: string): Promise<any> {
    try {
      loggingService.info(`Processing user input: ${input}`);
      return await this.agentService.processCommand(input);
    } catch (error) {
      loggingService.error('Error processing user input', error);
      throw error;
    }
  }

  async getCommandHistory(): Promise<string[]> {
    loggingService.debug('Retrieving command history...');
    return this.agentService.getCommandHistory();
  }

  async getToolMetrics(toolName: string): Promise<any> {
    loggingService.debug(`Retrieving metrics for tool: ${toolName}`);
    return await this.agentService.getToolMetrics(toolName);
  }

  async getAllToolMetrics(): Promise<Map<string, any>> {
    loggingService.debug('Retrieving all tool metrics...');
    return await this.agentService.getAllToolMetrics();
  }

  async getToolMetadata(toolName: string): Promise<any> {
    loggingService.debug(`Retrieving metadata for tool: ${toolName}`);
    return await this.agentService.getToolMetadata(toolName);
  }
}

// Usage
const app = new Application();
app.initialize().then(async () => {
  loggingService.info('Application started.');
}).catch(error => {
  loggingService.error('Failed to initialize application', error);
  process.exit(1);
});