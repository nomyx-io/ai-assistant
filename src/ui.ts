import readline from 'readline';
import chalk from 'chalk';
import boxen from 'boxen';
import { EventEmitter } from 'eventemitter3';
import { Theme, themes } from './themes';

export class UI extends EventEmitter {
  readlineInterface: any;
  currentTheme: Theme;

  constructor() {
    super();
    this.readlineInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });

    this.currentTheme = themes.default;
  }

  applyTheme(theme: Theme) {
    this.currentTheme = theme;
    this.updateOutput(`Applied ${theme.name} theme`, 'info');
    this.emit('themeChanged', theme as Theme);
  }

  switchTheme(themeName: string) {
    const newTheme = themes[themeName];
    if (newTheme) {
      this.applyTheme(newTheme);
      this.updateOutput(`Switched to ${newTheme.name} theme`, 'info');
      this.emit('themeChanged', newTheme);
    } else {
      this.updateOutput(`Theme '${themeName}' not found`, 'error');
    }
  }

  updateOutput(
    content: string,
    type: 'userInput' | 'aiResponse' | 'error' | 'warning' | 'info' | 'debug' | 'success' = 'info'
  ) {
    let coloredContent;
    switch (type) {
      case 'userInput':
        coloredContent = chalk.cyan(content);
        break;
      case 'aiResponse':
        coloredContent = chalk.green(content);
        break;
      case 'error':
        coloredContent = chalk.red(content);
        break;
      case 'warning':
        coloredContent = chalk.yellow(content);
        break;
      case 'info':
        coloredContent = chalk.blue(content);
        break;
      case 'debug':
        coloredContent = chalk.gray(content);
        break;
      case 'success':
        coloredContent = chalk.green(content);
        break;
      default:
        coloredContent = content;
    }
    // status is shown right above the prompt - we use terminal escape codes to move the cursor up
    process.stdout.write('\u001b[1A\u001b[2K');
    console.log(coloredContent);
  }

  getInput(): Promise<string> {
    return new Promise((resolve) => {
      this.readlineInterface.question('', (input) => {
        resolve(input);
      });
    });
  }

  displayBoxedContent(content: string, title?: string) {
    const boxedContent = boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      title: title,
      titleAlignment: 'center',
    });
    console.log(boxedContent);
  }
}