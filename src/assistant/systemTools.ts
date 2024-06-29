// systemTools.ts

import { UI } from './ui';
import ToolRegistry from './toolRegistry';
import { log, setLogLevel, toggleService } from './logger';
import chalk from "chalk";
import boxen from "boxen";

export const createSystemTools = (ui: UI, toolRegistry: ToolRegistry, sessionManager: any) => ({
  showHelp: {
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
      ui.updateOutput(boxen(helpText, { padding: 1 }));
    }
  },
  toggleDebug: {
    name: 'toggleDebug',
    description: 'Toggle debug mode on or off',
    execute: (session: any) => {
      session.debug = !session.debug;
      ui.updateOutput(`Debug mode is now ${session.debug ? 'on' : 'off'}`, 'info');
    }
  },
  showHistory: {
    name: 'showHistory',
    description: 'Display command history',
    execute: (session: any) => {
      if (session.history.length === 0) {
        ui.updateOutput('No commands in history.', 'info');
        return;
      }
      session.history.forEach((cmd: string, index: number) => {
        ui.updateOutput(`${index + 1}. ${cmd}`, 'info');
      });
    }
  },
  showState: {
    name: 'showState',
    description: 'Display current session state',
    execute: (session: any) => {
      const state = {
        id: session.id,
        debug: session.debug,
        historyLength: session.history.length
      };
      ui.updateOutput(boxen(JSON.stringify(state, null, 2), { padding: 1 }), 'info');
    }
  },
  exitSession: {
    name: 'exitSession',
    description: 'End the current session',
    execute: () => {
      sessionManager.exitSession();
    }
  },
  createNewSession: {
    name: 'createNewSession',
    description: 'Start a new session',
    execute: () => {
      sessionManager.createNewSession();
    }
  },
  switchSession: {
    name: 'switchSession',
    description: 'Change to a different session',
    execute: (index: number) => {
      sessionManager.switchToSession(index);
    }
  },
  setLogLevel: {
    name: 'setLogLevel',
    description: 'Change the logging level',
    execute: (level: string) => {
      setLogLevel(level);
      log('info', `Log level set to: ${level}`, 'SystemTools');
    }
  },
  toggleLogging: {
    name: 'toggleLogging',
    description: 'Turn logging on or off for a service',
    execute: (service: string, enable: boolean) => {
      toggleService(service, enable);
      log('info', `Logging ${enable ? 'enabled' : 'disabled'} for service: ${service}`, 'SystemTools');
    }
  },
  switchTheme: {
    name: 'switchTheme',
    description: 'Change the UI theme',
    execute: (themeName: string) => {
      ui.switchTheme(themeName);
    }
  },
  clearScreen: {
    name: 'clearScreen',
    description: 'Clear the terminal display',
    execute: () => {
      console.clear();
    }
  },
  listTools: {
    name: 'listTools',
    description: 'List all available tools',
    execute: async () => {
      const tools = await toolRegistry.getToolList();
      ui.updateOutput(chalk.bold("Available tools:"));
      tools.forEach((tool: any) => {
        ui.updateOutput(` ${chalk.cyan(tool.name)} (v${tool.version})`);
      });
    }
  },
  addTool: {
    name: 'addTool',
    description: 'Add a new tool',
    execute: async (name: string, source: string, schema: any, tags: string[]) => {
      try {
        const added = await toolRegistry.addTool(name, source, schema, tags);
        if (added) {
          ui.updateOutput(chalk.green(`Tool '${name}' added successfully.`), 'success');
        } else {
          ui.updateOutput(chalk.yellow(`Tool '${name}' already exists.`), 'warning');
        }
      } catch (error) {
        ui.updateOutput(chalk.red(`Error adding tool: ${error.message}`), 'error');
      }
    }
  },
  updateTool: {
    name: 'updateTool',
    description: 'Update an existing tool',
    execute: async (name: string, source: string) => {
      try {
        const tool = await toolRegistry.getTool(name);
        const updated = await toolRegistry.updateTool(name, source, tool.schema, tool.tags);
        if (updated) {
          ui.updateOutput(chalk.green(`Tool '${name}' updated successfully.`), 'success');
        } else {
          ui.updateOutput(chalk.yellow(`Tool '${name}' not found.`), 'warning');
        }
      } catch (error) {
        ui.updateOutput(chalk.red(`Error updating tool: ${error.message}`), 'error');
      }
    }
  },
  getToolHistory: {
    name: 'getToolHistory',
    description: 'Get the version history of a tool',
    execute: async (name: string) => {
      try {
        const history = await toolRegistry.getToolHistory(name);
        ui.updateOutput(`Version history for tool '${name}':`);
        history.forEach((version: any) => {
          ui.updateOutput(` v${version.version} - ${version.date}`);
        });
      } catch (error) {
        ui.updateOutput(`Error getting tool history: ${error.message}`, 'error');
      }
    }
  }
});