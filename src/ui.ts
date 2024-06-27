// ui.ts
import { grid as contrib_grid } from 'blessed-contrib';
import boxen from 'boxen';
import ora from 'ora';
import cliProgress from 'cli-progress';
import hljs from 'highlight.js';
import { fuzzySearch } from './fuzzy_search';
import * as contrib from 'blessed-contrib';
import { EventEmitter } from 'eventemitter3';
import blessed from 'blessed';
import { Theme, themes } from './themes';

// colors by type of message
const colors = {
  userInput: (text: string) => `{bold}{blue-fg}${text}{/}`,
  aiResponse: (text: string) => `{bold}{green-fg}${text}{/}`,
  error: (text: string) => `{bold}{red-fg}${text}{/}`,
  warning: (text: string) => `{bold}{yellow-fg}${text}{/}`,
  info: (text: string) => `{bold}{white-fg}${text}{/}`,
  debug: (text: string) => `{bold}{magenta-fg}${text}{/}`,
  success: (text: string) => `{bold}{green-fg}${text}{/}`,
  code: (text: string) => `{bold}{cyan-fg}${text}{/}`,
};

export class UI extends EventEmitter {
  grid: any;
  charts: { [key: string]: any } = {};
  spinner: ora.Ora;
  screen: blessed.Widgets.Screen;
  mainContainer: blessed.Widgets.BoxElement;
  outputBox: blessed.Widgets.ScrollableBoxElement;
  inputBox: blessed.Widgets.TextareaElement;
  statusBar: blessed.Widgets.BoxElement;
  progressBar: cliProgress.SingleBar;
  sessionOverviewPane: blessed.Widgets.ListElement;
  helpMenu: blessed.Widgets.ListElement;
  historyBrowser: blessed.Widgets.ListElement;
  historySearchInput: blessed.Widgets.TextareaElement;

  commandPalette: blessed.Widgets.ListElement;
  commandPaletteInput: blessed.Widgets.TextareaElement;
  toolManagementView: blessed.Widgets.BoxElement;
  toolDashboard: blessed.Widgets.BoxElement;

  currentTheme: Theme;

  constructor() {
    super();
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'AI Assistant'
    });
    this.spinner = ora({
      text: 'Processing...',
      spinner: 'dots',
    });

    // Create main container
    this.mainContainer = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    });

    // Create output box
    this.outputBox = blessed.scrollablebox({
      parent: this.mainContainer,
      top: 0,
      left: 0,
      width: '80%', // Adjusted width
      height: '90%-1', // Adjusted height
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      border: { type: 'line' },
      scrollbar: { ch: ' ', track: { bg: 'cyan' } },
    });

    // Create input box
    this.inputBox = blessed.textarea({
      parent: this.mainContainer,
      bottom: 1, // Adjusted position
      left: 0,
      width: '100%',
      height: 3,
      inputOnFocus: true,
      border: { type: 'line' },
      label: ' Input ',
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'blue',
        },
        focus: {
          border: {
            fg: 'green',
          },
        },
      },
    });

    // Focus on the input box by default
    this.inputBox.focus();

    // Refocus on input box after any action
    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.inputBox.focus();
    });

    // Create status bar
    this.statusBar = blessed.box({
      parent: this.mainContainer,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: '',
      style: {
        fg: 'white',
        bg: 'blue'
      }
    });

    // Create session overview pane
    this.sessionOverviewPane = blessed.list({
      parent: this.mainContainer,
      top: 0,
      right: 0,
      width: '20%',
      height: '100%-1',
      border: { type: 'line' },
      label: 'Sessions',
      keys: true,
      vi: true,
      mouse: true,
      style: {
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      }
    });

    // Create help menu
    this.helpMenu = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: '50%',
      border: { type: 'line' },
      label: 'Help Menu',
      keys: true,
      vi: true,
      mouse: true,
      hidden: true,
      style: {
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      }
    });

    // Create command palette
    this.commandPalette = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: '50%',
      border: { type: 'line' },
      label: 'Command Palette',
      keys: true,
      vi: true,
      mouse: true,
      hidden: true,
      style: {
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      }
    });

    // Create command palette input
    this.commandPaletteInput = blessed.textarea({
      parent: this.commandPalette,
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      inputOnFocus: true,
      border: { type: 'line' },
      label: 'Search'
    });

    // Create history browser
    this.historyBrowser = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      border: { type: 'line' },
      label: 'Command History',
      keys: true,
      vi: true,
      mouse: true,
      hidden: true,
      style: {
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      }
    });

    // Create history search input
    this.historySearchInput = blessed.textarea({
      parent: this.historyBrowser,
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      inputOnFocus: true,
      border: { type: 'line' },
      label: 'Search'
    });

    // Create tool management view (initially hidden)
    this.toolManagementView = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      hidden: true,
      border: { type: 'line' },
      label: 'Tool Management View'
    });

    // Create tool dashboard (initially hidden)
    this.toolDashboard = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      hidden: true,
      border: { type: 'line' },
      label: 'Tool Generation Dashboard'
    });

    // Set up keybindings
    this.screen.key(['C-l'], () => this.clearScreen());
    this.screen.key(['C-c'], () => this.handleInterrupt());
    this.screen.key(['C-p'], () => this.toggleCommandPalette());
    this.screen.key(['f1'], () => this.toggleHelpMenu());
    this.screen.key(['C-h'], () => this.toggleHistoryBrowser());

    // Initialize progress bar
    this.progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

    // Initialize grid for charts and visualizations
    this.grid = new contrib_grid({ rows: 12, cols: 12, screen: this.screen });

    // Apply default theme
    this.currentTheme = themes.default;
    this.applyTheme(this.currentTheme);
  }

  // Apply a theme to the UI
  applyTheme(theme: Theme) {
    this.currentTheme = theme;

    // Update screen colors
    (this.screen as any).style.bg = theme.background;
    (this.screen as any).style.fg = theme.foreground;

    // Apply theme to main container and its children
    this.mainContainer.style.border.fg = theme.border;
    this.outputBox.style.border.fg = theme.border;
    this.outputBox.style.scrollbar = { bg: theme.scrollbar.bg };
    this.inputBox.style.border.fg = theme.border;
    this.statusBar.style.bg = theme.border;
    this.statusBar.style.fg = theme.background;

    // Apply theme to other UI elements
    [
      this.sessionOverviewPane,
      this.helpMenu,
      this.commandPalette,
      this.historyBrowser,
      this.toolManagementView,
      this.toolDashboard
    ].forEach(element => {
      if (element) {
        element.style.border.fg = theme.border;
        element.style.scrollbar = { bg: theme.scrollbar.bg };
        element.style.selected = { bg: theme.focus.border, fg: theme.background };
      }
    });

    this.screen.render();
  }

  // Switch to a different theme
  switchTheme(themeName: string) {
    const newTheme = themes[themeName];
    if (newTheme) {
      this.applyTheme(newTheme);
      this.updateOutput(`Switched to ${newTheme.name} theme`, 'info');
    } else {
      this.updateOutput(`Theme '${themeName}' not found`, 'error');
    }
  }

  // Toggle the visibility of the history browser
  toggleHistoryBrowser() {
    this.historyBrowser.toggle();
    if (!this.historyBrowser.hidden) {
      this.historySearchInput.focus();
    }
    this.screen.render();
  }

  // Update the content of the history browser
  updateHistoryBrowser(commands: string[], currentPage: number, totalPages: number) {
    const items = commands.map((cmd, index) => `${index + 1}: ${cmd}`);
    items.push(`--- Page ${currentPage}/${totalPages} ---`);
    this.historyBrowser.setItems(items);
    this.screen.render();
  }

  // Set up event handlers for the history browser
  setupHistoryBrowserEvents(
    onSelect: (command: string) => void,
    onSearch: (term: string) => void,
    onNextPage: () => void,
    onPrevPage: () => void
  ) {
    this.historyBrowser.on('select', (item) => {
      if (item) {
        const command = item.content.split(': ')[1];
        onSelect(command);
        this.toggleHistoryBrowser();
      }
    });

    this.historySearchInput.on('keypress', (ch, key) => {
      if (key.name === 'enter') {
        const searchTerm = this.historySearchInput.getValue();
        onSearch(searchTerm);
      }
    });

    this.historyBrowser.key(['right'], onNextPage);
    this.historyBrowser.key(['left'], onPrevPage);
  }

  // Create a new chart and add it to the UI
  createChart(type: 'line' | 'bar' | 'pie', title: string, data: any) {
    let chart;
    switch (type) {
      case 'line':
        chart = this.grid.set(0, 0, 6, 6, contrib.line, {
          style: { line: "yellow", text: "green", baseline: "black" },
          xLabelPadding: 3,
          xPadding: 5,
          label: title
        });
        chart.setData([{ x: data.x, y: data.y, title: data.title }]);
        break;
      case 'bar':
        chart = this.grid.set(6, 0, 6, 6, contrib.bar, {
          label: title,
          barWidth: 4,
          barSpacing: 6,
          xOffset: 0,
          maxHeight: 9
        });
        chart.setData({ titles: data.titles, data: data.data });
        break;
      case 'pie':
        chart = this.grid.set(0, 6, 6, 6, (contrib_grid as any).pie, {
          label: title,
          radius: 8
        });
        break;
    }
    this.charts[title] = chart;
    this.screen.render();
  }

  // Update the data of an existing chart
  updateChart(title: string, data: any) {
    const chart = this.charts[title];
    if (chart) {
      chart.setData(data);
      this.screen.render();
    }
  }

  // Toggle the visibility of the command palette
  toggleCommandPalette() {
    this.commandPalette.toggle();
    if (!this.commandPalette.hidden) {
      this.commandPaletteInput.focus();
    }
    this.screen.render();
  }

  // Update the list of commands in the command palette
  updateCommandPalette(commands: string[]) {
    this.commandPalette.setItems(commands);
    this.screen.render();
  }

  // Set up event handlers for the command palette
  setupCommandPaletteEvents(onSelect: (command: string) => void) {
    this.commandPaletteInput.on('keypress', (ch, key) => {
      if (key.name === 'enter') {
        const selectedIndex = (this.commandPalette as any).selected;
        const selected = this.commandPalette.getItem(selectedIndex);
        if (selected) {
          onSelect(selected.content);
          this.toggleCommandPalette();
        }
      } else {
        setTimeout(() => {
          const searchTerm = this.commandPaletteInput.getValue();
          const allCommands = (this.commandPalette as any).items.map((item: any) => item.content);
          const filteredCommands = fuzzySearch(allCommands, searchTerm);
          this.updateCommandPalette(filteredCommands);
        }, 0);
      }
    });
  }

  // Toggle the visibility of the help menu
  toggleHelpMenu() {
    this.helpMenu.toggle();
    this.screen.render();
  }

  // Update the content of the help menu
  updateHelpMenu(commands: { name: string; description: string }[]) {
    this.helpMenu.setItems(commands.map(c => `${c.name}: ${c.description}`));
    this.screen.render();
  }

  // Show a tooltip with the given text
  showTooltip(text: string, timeout: number = 3000) {
    const tooltip = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 'shrink',
      content: text,
      border: { type: 'line' },
      style: {
        border: {
          fg: 'yellow'
        }
      }
    });
    this.screen.render();
    setTimeout(() => {
      tooltip.destroy();
      this.screen.render();
    }, timeout);
  }

  // Update the output box with new content
  updateOutput(
    content: string,
    type: 'userInput' | 'aiResponse' | 'error' | 'warning' | 'info' | 'debug' | 'success' = 'info'
  ) {
    let coloredContent;
    switch (type) {
      case 'userInput':
        coloredContent = `{cyan-fg}${content}{/cyan-fg}`;
        break;
      case 'aiResponse':
        coloredContent = `{green-fg}${content}{/green-fg}`;
        break;
      case 'error':
        coloredContent = `{red-fg}${content}{/red-fg}`;
        break;
      case 'warning':
        coloredContent = `{yellow-fg}${content}{/yellow-fg}`;
        break;
      case 'info':
        coloredContent = `{blue-fg}${content}{/blue-fg}`;
        break;
      case 'debug':
        coloredContent = `{gray-fg}${content}{/gray-fg}`;
        break;
      case 'success':
        coloredContent = `{green-fg}${content}{/green-fg}`;
        break;
      default:
        coloredContent = content;
    }
    this.outputBox.pushLine(coloredContent);
    this.outputBox.setScrollPerc(100);
    this.screen.render();
  }

  // Update the status bar with new information
  updateStatusBar(sessionInfo: string, activeTools: string[], memoryUsage: number, performance: number) {
    const statusContent = `Session: ${sessionInfo} | Active Tools: ${activeTools.join(', ')} | Memory: ${memoryUsage.toFixed(2)}MB | Performance: ${performance.toFixed(2)}ms`;
    this.statusBar.setContent(statusContent);
    this.screen.render();
  }

  // Create a fade transition effect
  async fadeTransition() {
    for (let i = 5; i > 0; i--) {
      this.outputBox.style.transparent = true;
      this.outputBox.style.fg = `rgba(255,255,255,0.${i})`;
      this.screen.render();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    for (let i = 1; i <= 5; i++) {
      this.outputBox.style.transparent = false;
      this.outputBox.style.fg = `rgba(255,255,255,0.${i})`;
      this.screen.render();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Update the session overview pane with a list of sessions
  updateSessionOverview(sessions: { id: string; active: boolean }[]) {
    this.sessionOverviewPane.setItems(sessions.map(s => `${s.active ? '* ' : ' '}Session ${s.id}`));
    this.screen.render();
  }

  // Clear the content of the output box
  clearScreen() {
    this.outputBox.setContent('');
    this.screen.render();
  }

  // Handle interrupt signals
  handleInterrupt() {
    if (this.spinner.isSpinning) {
      this.stopSpinner();
      this.updateOutput('Operation interrupted');
    } else {
      process.exit(0);
    }
  }

  // Start the progress bar
  startProgressBar(total: number) {
    this.progressBar.start(total, 0);
  }

  // Update the progress bar value
  updateProgressBar(value: number) {
    this.progressBar.update(value);
  }

  // Stop the progress bar
  stopProgressBar() {
    this.progressBar.stop();
  }

  // Start the spinner
  startSpinner(text: string = 'Processing...') {
    this.spinner.text = text;
    this.spinner.start();
  }

  // Stop the spinner
  stopSpinner() {
    this.spinner.stop();
  }

  // Get user input from the input box
  getInput(): Promise<string> {
    return new Promise((resolve) => {
      this.inputBox.readInput((err, value) => {
        if (err) throw err;
        this.inputBox.clearValue();
        this.screen.render();
        resolve(value);
      });
    });
  }

  // Update the status bar with a new message
  updateStatus(status: string) {
    this.statusBar.setContent(status);
    this.screen.render();
  }

  // Display content in a boxed format
  displayBoxedContent(content: string, title?: string) {
    const boxedContent = boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      title: title,
      titleAlignment: 'center',
    });
    this.updateOutput(boxedContent);
  }

  // Show the tool management view
  showToolManagementView() {
    this.toolManagementView.show();
    this.screen.render();
  }

  // Hide the tool management view
  hideToolManagementView() {
    this.toolManagementView.hide();
    this.screen.render();
  }

  // Show the tool dashboard
  showToolDashboard() {
    this.toolDashboard.show();
    this.screen.render();
  }

  // Hide the tool dashboard
  hideToolDashboard() {
    this.toolDashboard.hide();
    this.screen.render();
  }
}