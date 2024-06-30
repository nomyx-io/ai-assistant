// ui.ts
import readline from 'readline';
import chalk from 'chalk';
import { loggingService } from '../logging/logger';
import { UILogger } from './uiLogger';
import { loggingConfig } from '../logging/config';
import { EventEmitter } from 'events';

export class EnhancedUI extends EventEmitter {
  private uiLogger: UILogger;
  private logColors: { [key: string]: string } = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    verbose: 'cyan'
  };
  private rl: readline.Interface;
  private levels: string[] = [ 'error', 'warn', 'info', 'debug', 'verbose' ];
  private level: string = 'info';

  constructor() {
    super();
    this.setOutputLevel('info');

    this.uiLogger = new UILogger({
      ui: this,
      level: loggingConfig.ui.level
    });
    loggingService.addTransport(this.uiLogger);

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('AI> ')
    });

    this.setupReadlineInterface();
  }
  
  private setupReadlineInterface(): void {
    this.rl.on('line', (line) => {
      line = line.trim();
      if (line) {
        this.emit('command', line);
      }
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log(chalk.yellow('Goodbye!'));
      process.exit(0);
    });

    // Initial prompt
    this.rl.prompt();
  }

  updateOutput(content: string, level: string = 'info'): void {
    const color = this.logColors[level] || 'white';
    
    // Clear the current line
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);

    // Write the content
    console.log(chalk[color](content));

    // Re-render the prompt
    this.rl.prompt(true);
  }

  setOutputLevel(level: string): void {
    this.level = level;
  }

  async getUserInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.cyan(prompt), (answer) => {
        resolve(answer);
      });
    });
  }

  displayWelcomeMessage(): void {
    console.log(chalk.bold.green('Welcome to the AI Assistant!'));
    console.log(chalk.yellow('Type your commands and press Enter. Type "exit" to quit.'));
    this.rl.prompt();
  }

  clearScreen(): void {
    console.clear();
  }

  close(): void {
    this.rl.close();
  }
}