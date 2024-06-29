import { ChromaClient } from 'chromadb';
import { TerminalSessionManager } from './assistant/terminalSessionManager';
import { Assistant } from './assistant/assistant';
import { MaintenanceManager } from './assistant/maintenance';
import { log } from './assistant/logger';
import chalk from 'chalk';
import * as packageJson from '../package.json';
import ToolRegistry from './assistant/toolRegistry';


const client = new ChromaClient({
  path: 'http://localhost:8000',
});

async function main() {
  const sessionManager = new TerminalSessionManager(client);
  const assistant = new Assistant(sessionManager, sessionManager.chromaClient);
  const maintenanceManager = new MaintenanceManager(
    assistant,
    sessionManager as ToolRegistry,
    assistant.memoryStore
  );
  (sessionManager as ToolRegistry).initializeToolWatcher();

  // Set up periodic maintenance
  setInterval(() => {
    maintenanceManager.performMaintenance();
  }, 24 * 60 * 60 * 1000); // Run every 24 hours

  // Handle command-line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    log('info', chalk.bold.yellow(`AI Assistant CLI Version ${packageJson.version}`), 'Main');
    log('info', chalk.yellow("Type '.help' for instructions."), 'Main');
    sessionManager.ui.readlineInterface.prompt();
  } else {
    const query = args.join(' ');
    try {
      const response = await assistant.callAgent(query);
      console.log(response);
      process.exit(0);
    } catch (error) {
      log('error', error, 'Main');
      process.exit(1);
    }
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
    // Perform any necessary cleanup here
    process.exit();
  });
}

main().catch(error => {
  console.error("An error occurred in the main function:", error);
  process.exit(1);
});