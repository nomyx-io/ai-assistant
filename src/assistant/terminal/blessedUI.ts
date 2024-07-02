import * as blessed from 'blessed';
import * as contrib from 'blessed-contrib';
import { EventEmitter } from 'events';
import chalk from 'chalk';

const themes = {
  light: {
    fg: 'black',
    bg: 'white',
  },
  dark: {
    fg: 'white',
    bg: 'black',
  },
};

export class BlessedUI extends EventEmitter {
  private screen: any
  private outputBox: any
  private inputBox: any
  private statusBar: any

  constructor() {
    super();
    this.initializeScreen();
    this.createLayout();
    this.setupEventHandlers();
    this.render();
  }

  private initializeScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Enhanced AI Assistant',
    });

    this.screen.key(['C-c'], () => this.exit());
  }

  private createLayout(): void {
    // Status Bar
    this.statusBar = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: '{center}AI Assistant - Ready{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue',
      },
    });

    // Output Box
    this.outputBox = blessed.box({
      parent: this.screen,
      top: 1,
      left: 0,
      width: '100%',
      height: '100%-3',
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      border: { type: 'line' },
      scrollbar: {
        ch: ' ',
        style: { bg: 'cyan' },
      },
      style: {
        fg: 'white',
        bg: 'black',
      },
    });

    // Input Box
    this.inputBox = blessed.textbox({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      inputOnFocus: true,
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
      },
    });
  }

  private setupEventHandlers(): void {
    this.inputBox.key('enter', () => {
      const command = this.inputBox.getValue();
      this.emit('command', command);
      this.inputBox.clearValue();
      this.render();
    });

    this.inputBox.key('escape', () => {
      this.emit('cancelTask');
    });
  }

  public switchTheme(themeName: string): void {
    // Switch the theme of the UI

  }

  public clear(): void {
    this.outputBox.setContent('');
    this.render();
  }

  public addToOutput(message: string): void {
    this.outputBox.pushLine(message);
    this.outputBox.setScrollPerc(100);
    this.render();
  }

  public updateStatus(status: string): void {
    this.statusBar.setContent(`{center}${status}{/center}`);
    this.render();
  }

  public updateSpinner(message: string): void {
    this.statusBar.setContent(`{center}${message}{/center}`);
    this.render();
  }

  public startSpinner(): void {
    this.statusBar.setContent('{center}Processing Command...{/center}');
    this.render();
  }

  public stopSpinner(): void {
    this.statusBar.setContent('{center}Ready{/center}');
    this.render();
  }

  public log(message: string): void {
    this.addToOutput(chalk.green(`AI: ${message}`));
  }

  public highlightTask(index: number): void {
    // Highlight the task at the given index
  }
  
  public updateTasks(tasks: string[]): void {
    // Update the list of tasks in the UI
  }

  public render(): void {
    this.screen.render();
  }

  public focusInput(): void {
    this.inputBox.focus();
  }

  public exit(): void {
    this.screen.destroy();
    process.exit(0);
  }
}