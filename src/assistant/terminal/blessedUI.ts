import * as blessed from 'blessed';
import * as contrib from 'blessed-contrib';
import Chart from 'cli-chart';

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
  private screen: any;
  private outputBox: any;
  private inputBox: any;
  private statusBar: any;
  private taskList: any;

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
      width: '70%',
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

    // Task List (Right Sidebar)
    this.taskList = blessed.list({
      parent: this.screen,
      top: 1,
      right: 0,
      width: '30%',
      height: '100%-3',
      border: { type: 'line' },
      label: ' Tasks ',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      style: {
        fg: 'white',
        bg: 'black',
        selected: {
          bg: 'blue',
        },
        item: {
          hover: {
            bg: 'blue',
          },
        },
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
    try {
      const parsedMessage = JSON.parse(message);
      this.addToOutput(JSON.stringify(parsedMessage, null, 2));
    } catch (error) {
      this.addToOutput(chalk.yellow(message));
    }
  }

  public highlightTask(index: number): void {
    this.taskList.select(index);
    this.render();
  }
  
  public updateTasks(tasks: string[]): void {
    this.taskList.setItems(tasks);
    this.render();
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

  public createChart(type: string, titles: string[], data: any): void {
    // Create a chart in the output box
    if(type === 'bar') {
      var chart = new Chart({
          xlabel: 'snausages/hr',
          ylabel: 'dog\nhappiness',
          direction: 'y',
          width: 80,
          height: 20,
          lmargin: 15,
          step: 4
      });
      chart.addBar(3, 'red');
      chart.addBar(9).addBar(13).addBar(15).addBar(16);
      chart.draw();    
    }
  }

  public createTable(title: string, data: any): void {
    // Create a table in the output box
    // format data into a table and output it 

  }
}