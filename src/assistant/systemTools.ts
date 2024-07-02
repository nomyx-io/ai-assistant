import boxen from 'boxen';
import chalk from 'chalk';
import { ToolRegistry } from './tools/toolRegistry';
import { AgentService } from './agentService';
import { loggingService } from './logging/logger';
import { BlessedUI } from './terminal/blessedUI';

export class SystemTools {
  constructor(
    private ui: BlessedUI,
    private toolRegistry: ToolRegistry,
    private sessionManager: any,
    private agentService: AgentService
  ) {}

  showHelp = {
    name: 'showHelp',
    description: 'Display help information about available commands',
    execute: () => {
      const helpText = `
Available commands:
- Show help: Ask for help or command list
- Toggle debug mode: Turn debug mode on or off
- Show history: Display command history
- Show session state: Display current session state
- Exit session: End the current session
- Create new session: Start a new session
- Switch session: Change to a different session
- Set log level: Change the logging level
- Enable/Disable logging: Turn logging on or off for a service
- Switch theme: Change the UI theme
- Clear screen: Clear the terminal display
- Manage tools: List, add, update, or get history of tools
      `;
      this.ui.log(boxen(helpText, { padding: 1 }));
    }
  };

  toggleDebug = {
    name: 'toggleDebug',
    description: 'Toggle debug mode on or off',
    execute: (session: any) => {
      session.debug = !session.debug;
      this.ui.log(`Debug mode is now ${session.debug ? 'on' : 'off'}`);
    }
  };

  showHistory = {
    name: 'showHistory',
    description: 'Display command history',
    execute: async () => {
      const history = await this.agentService.getCommandHistory();
      if (history.length === 0) {
        this.ui.log('No commands in history.');
        return;
      }
      history.forEach((cmd: string, index: number) => {
        this.ui.log(`${index + 1}. ${cmd}`);
      });
    }
  };

  showState = {
    name: 'showState',
    description: 'Display current session state',
    execute: (session: any) => {
      const state = {
        id: session.id,
        debug: session.debug,
        historyLength: session.history.length
      };
      this.ui.log(boxen(JSON.stringify(state, null, 2), { padding: 1 }));
    }
  };

  exitSession = {
    name: 'exitSession',
    description: 'End the current session',
    execute: () => {
      this.sessionManager.exitSession();
    }
  };

  createNewSession = {
    name: 'createNewSession',
    description: 'Start a new session',
    execute: () => {
      this.sessionManager.createNewSession();
    }
  };

  switchSession = {
    name: 'switchSession',
    description: 'Change to a different session',
    execute: (index: number) => {
      this.sessionManager.switchToSession(index);
    }
  };

  setLogLevel = {
    name: 'setLogLevel',
    description: 'Change the logging level',
    execute: (level: string) => {
      loggingService.setLogLevel(level);
      this.ui.log(`Log level set to: ${level}`);
    }
  };

  toggleLogging = {
    name: 'toggleLogging',
    description: 'Turn logging on or off for a service',
    execute: (service: string, enable: boolean) => {
      loggingService.toggleService(service, enable);
      this.ui.log(`Logging ${enable ? 'enabled' : 'disabled'} for service: ${service}`);
    }
  };

  switchTheme = {
    name: 'switchTheme',
    description: 'Change the UI theme',
    execute: (themeName: string) => {
      this.ui.switchTheme(themeName);
    }
  };

  clearScreen = {
    name: 'clearScreen',
    description: 'Clear the terminal display',
    execute: () => {
      this.ui.clear();
    }
  };

  listTools = {
    name: 'listTools',
    description: 'List all available tools',
    execute: async () => {
      const tools = await this.toolRegistry.getToolList();
      this.ui.log(chalk.bold("Available tools:"));
      tools.forEach((tool: any) => {
        this.ui.log(` ${chalk.cyan(tool.name)} (v${tool.metadata.version})`);
      });
    }
  };

  addTool = {
    name: 'addTool',
    description: 'Add a new tool',
    execute: async (name: string, source: string, schema: any, tags: string[]) => {
      try {
        const added = await this.toolRegistry.addTool(name, source, schema, tags, new Function('params', source));
        if (added) {
          this.ui.log(chalk.green(`Tool '${name}' added successfully.`));
        } else {
          this.ui.log(chalk.yellow(`Tool '${name}' already exists.`));
        }
      } catch (error) {
        this.ui.log(chalk.red(`Error adding tool: ${error.message}`));
      }
    }
  };

  updateTool = {
    name: 'updateTool',
    description: 'Update an existing tool',
    execute: async (name: string, source: string) => {
      try {
        const tool = await this.toolRegistry.getTool(name);
        if (tool) {
          const updated = await this.toolRegistry.updateTool(name, source, tool.schema, tool.tags);
          if (updated) {
            this.ui.log(chalk.green(`Tool '${name}' updated successfully.`));
          } else {
            this.ui.log(chalk.yellow(`Failed to update tool '${name}'.`));
          }
        } else {
          this.ui.log(chalk.yellow(`Tool '${name}' not found.`));
        }
      } catch (error) {
        this.ui.log(chalk.red(`Error updating tool: ${error.message}`));
      }
    }
  };

  getToolHistory = {
    name: 'getToolHistory',
    description: 'Get the version history of a tool',
    execute: async (name: string) => {
      try {
        const tool = await this.toolRegistry.getTool(name);
        if (tool) {
          this.ui.log(`Version history for tool '${name}':`);
          this.ui.log(` v${tool.metadata.version} - ${tool.metadata.lastModifiedDate}`);
        } else {
          this.ui.log(chalk.yellow(`Tool '${name}' not found.`));
        }
      } catch (error) {
        this.ui.log(`Error getting tool history: ${error.message}`);
      }
    }
  };
}