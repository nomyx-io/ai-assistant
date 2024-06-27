
import Assistant from "./assistant/assistant";
import { AssistantSessionManager, AssistantSession } from "./assistant/index";
import { MaintenanceManager } from './assistant/maintenance';
import chalk from "chalk";
import boxen from "boxen";
import blessed from 'blessed';
import { themes } from './themes';
import readline from 'readline';
import * as packageJson from "../package.json";
import fs from 'fs';
import { ChromaClient } from "chromadb";
import { tools } from "./assistant/tools";
import ajv from 'ajv';
import { toolRegistryTools } from "./assistant/tool_registry";
import { log, setLogLevel, toggleService } from './logger';
import { UI } from "./ui";
import os from 'os';
import { VisualizationAPI } from './visualization_api';
import { WorkflowResult } from "./assistant/workflow";

const jsonSchemaValidator = new ajv();

async function jsonValidator(
    jsonSchema: string,
    jsonData: string,
): Promise<boolean> {
    try {
        const schema = JSON.parse(jsonSchema);
        const data = JSON.parse(jsonData);
        const validate = jsonSchemaValidator.compile(schema);
        const valid = validate(data);
        return valid;
    } catch (error) {
        return false;
    }
}

// Generic error handling function for file system operations
async function handleFileError(context: any, api: any) {
    const logError = (message: string, level: string = 'error') => {
        log(level, message, 'FileOperations');
    };

    logError(`File operation error: ${JSON.stringify(context)} `);

    const llmResponse = await api.callTool('callLLM', {
        system_prompt: 'Analyze the file operation error and suggest a fix.',
        prompt: JSON.stringify(context),
    });

    if (llmResponse.fix) {
        logError(`Attempting LLM fix: ${llmResponse.fix} `, 'debug');
        try {
            // Attempt to apply the LLM's fix (make sure it's safe!)
            // ... (Implement safe fix application logic here)
        } catch (fixError: any) {
            logError(`LLM fix attempt failed: ${fixError.message} `, 'error');
        }
    }

    // Safe Fallback:
    if (context.errorCode === 'ENOENT') {
        logError('File not found. Suggest creating the file or checking the path.', 'info');
        // ... (Implement logic to suggest file creation or path correction)
    } else {
        logError(`Unhandled file error code: ${context.errorCode} `, 'error');
        // ... (Handle other error codes with appropriate fallbacks)
    }
}


class TerminalSessionManager extends AssistantSessionManager {

    visualizationAPI: VisualizationAPI;
    readlineInterface: any;
    ui: UI;

    commandHistory: string[] = [];
    currentHistoryPage: number = 1;
    itemsPerPage: number = 10;

    extraTools: any = {
        wait_for_keypress: {
            'name': 'wait_for_keypress',
            'version': '1.0.0',
            'description': 'wait_for_keypress pauses execution until the user presses a key. Returns the key that was pressed and sets it to the resultVar if provided.',
            'schema': {
                'name': 'wait_for_keypress',
                'description': 'wait_for_keypress pauses execution until the user presses a key. Returns the key that was pressed and sets it to the resultVar if provided.',
                "methodSignature": "wait_for_keypress(resultVar?: string): string",
            },
            execute: async ({ resultVar }: any, api: any) => {
                const readline = require('readline');
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                });

                return new Promise((resolve) => {
                    rl.question('Press any key to continue...', (key: string) => {
                        rl.close();
                        if (resultVar) {
                            api.store[resultVar] = key;
                        }
                        resolve(key);
                    });
                });
            },
        },
        'busybox2': {
            'name': 'files',
            'version': '1.0.0',
            'description': 'Performs file operations. Supported operations include read, append, prepend, replace, insert_at, remove, delete, copy..',
            'schema': {
                'name': 'busybox2',
                'description': 'Performs file operations. Supported operations include read, append, prepend, replace, insert_at, remove, delete, copy..',
                "methodSignature": "files(operations: { operation: string, path?: string, match?: string, data?: string, position?: number, target?: string }[]): string",
            },
            execute: async function ({ operations }: any, run: any) {
                try {
                    const fs = require('fs');
                    const pathModule = require('path');
                    const cwd = process.cwd();
                    for (const { operation, path, match, data, position, target } of operations) {
                        const p = pathModule.join(cwd, path || '');
                        const t = pathModule.join(cwd, target || '');
                        if (!fs.existsSync(p || t)) {
                            return `Error: File not found at path ${p || t} `;
                        }
                        let text = fs.readFileSync(p, 'utf8');
                        switch (operation) {
                            case 'read':
                                return text;
                            case 'append':
                                text += data;
                                break;
                            case 'prepend':
                                text = data + text;
                                break;
                            case 'replace':
                                text = text.replace(match, data);
                                break;
                            case 'insert_at':
                                text = text.slice(0, position) + data + text.slice(position);
                                break;
                            case 'remove':
                                text = text.replace(match, '');
                                break;
                            case 'delete':
                                fs.unlinkSync(p);
                                break;
                            case 'copy':
                                fs.copyFileSync(p, t);
                                break;
                            default:
                                return `Error: Unsupported operation ${operation} `;
                        }
                        fs.writeFileSync(p, text);
                    }
                    return `Successfully executed batch operations on files`;
                } catch (error: any) {
                    const context = {
                        errorCode: error.code,
                        operations: operations,
                        // ... other details
                    };
                    await handleFileError(context, run);
                    return `File operation '${operations}' failed. Check logs for details.`;
                }
            },
        },
    }

    constructor(public chromaClient: ChromaClient) {

        super(chromaClient);
        this.ui = new UI();
        this.initializeUI();
        this.initializeReadlineCompatibility();
        this.initializeSessionManagement();
        this.startStatusBarUpdates();
        this.initializeHelpSystem();
        this.initializeCommandPalette();

        this.visualizationAPI = new VisualizationAPI(this.ui);

        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);

        this.addTool('wait_for_keypress', this.extraTools.wait_for_keypress.execute.toString(), this.extraTools.wait_for_keypress.schema, ['utility']);
        this.addTool('list_tools', toolRegistryTools.list_tools.execute.toString(), toolRegistryTools.list_tools.schema, ['utility']);
        this.addTool('add_tool', toolRegistryTools.add_tool.execute.toString(), toolRegistryTools.add_tool.schema, ['utility']);
        this.addTool('update_tool', toolRegistryTools.update_tool.execute.toString(), toolRegistryTools.update_tool.schema, ['utility']);
        this.addTool('delete_tool', toolRegistryTools.delete_tool.execute.toString(), toolRegistryTools.delete_tool.schema, ['utility']);
        this.addTool('get_tool_metadata', toolRegistryTools.get_tool_metadata.execute.toString(), toolRegistryTools.get_tool_metadata.schema, ['utility']);
        this.addTool('update_tool_metadata', toolRegistryTools.update_tool_metadata.execute.toString(), toolRegistryTools.update_tool_metadata.schema, ['utility']);
        this.addTool('get_tool_performance', toolRegistryTools.get_tool_performance.execute.toString(), toolRegistryTools.get_tool_performance.schema, ['utility']);
        this.addTool('get_all_performance_metrics', toolRegistryTools.get_all_performance_metrics.execute.toString(), toolRegistryTools.get_all_performance_metrics.schema, ['utility']);
        this.addTool('run_maintenance', toolRegistryTools.run_maintenance.execute.toString(), toolRegistryTools.run_maintenance.schema, ['utility']);
        this.addTool('analyze_and_create_tool', toolRegistryTools.analyze_and_create_tool.execute.toString(), toolRegistryTools.analyze_and_create_tool.schema, ['utility']);
        this.addTool('predict_likely_tools', toolRegistryTools.predict_likely_tools.execute.toString(), toolRegistryTools.predict_likely_tools.schema, ['utility']);
        this.addTool('get_tool_history', toolRegistryTools.get_tool_history.execute.toString(), toolRegistryTools.get_tool_history.schema, ['utility']);
        this.addTool('rollback_tool', toolRegistryTools.rollback_tool.execute.toString(), toolRegistryTools.rollback_tool.schema, ['utility']);
        this.addTool('generate_tool_report', toolRegistryTools.generate_tool_report.execute.toString(), toolRegistryTools.generate_tool_report.schema, ['utility']);
        this.addTool('busybox2', this.extraTools.busybox2.execute.toString(), this.extraTools.busybox2.schema, ['utility']);

        const toolList = Object.values(tools);
        toolList.forEach((tool) => {
            this.addTool(tool.name, tool.execute.toString(), tool.schema, tool.tags);
        });

        setTimeout(async () => {
            this.sessions[this.activeSessionIndex] && this.sessions[this.activeSessionIndex].emit('text', 'running self-improvement tasks...')
            await this.generateAndRunTests();
            await this.improveTools();
        }, 60000);

        this.initializeHistoryBrowser();
        this.initializeThemeSupport();
    }


    initializeThemeSupport() {
        this.ui.screen.key(['C-t'], () => this.showThemeSelector());
    }

    showThemeSelector() {
        const themeNames = Object.keys(themes);
        const themeSelector = blessed.list({
            parent: this.ui.screen,
            top: 'center',
            left: 'center',
            width: '30%',
            height: '50%',
            border: { type: 'line' },
            label: 'Select Theme',
            items: themeNames,
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

        themeSelector.on('select', (item) => {
            const selectedTheme = item.content;
            this.ui.switchTheme(selectedTheme);
            themeSelector.destroy();
            this.ui.screen.render();
        });

        themeSelector.focus();
        this.ui.screen.render();
    }

    initializeHistoryBrowser() {
        this.ui.setupHistoryBrowserEvents(
            this.rerunCommand.bind(this),
            this.searchHistory.bind(this),
            this.nextHistoryPage.bind(this),
            this.prevHistoryPage.bind(this)
        );
    }

    rerunCommand(command: string) {
        this.executeCommandInActiveSession(command);
    }

    searchHistory(term: string) {
        const filteredHistory = this.commandHistory.filter(cmd => cmd.includes(term));
        this.updateHistoryBrowser(filteredHistory);
    }

    nextHistoryPage() {
        const totalPages = Math.ceil(this.commandHistory.length / this.itemsPerPage);
        if (this.currentHistoryPage < totalPages) {
            this.currentHistoryPage++;
            this.updateHistoryBrowser();
        }
    }

    prevHistoryPage() {
        if (this.currentHistoryPage > 1) {
            this.currentHistoryPage--;
            this.updateHistoryBrowser();
        }
    }

    updateHistoryBrowser(commands: string[] = this.commandHistory) {
        const startIndex = (this.currentHistoryPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageCommands = commands.slice(startIndex, endIndex);
        const totalPages = Math.ceil(commands.length / this.itemsPerPage);
        this.ui.updateHistoryBrowser(pageCommands, this.currentHistoryPage, totalPages);
    }

    initializeCommandPalette() {
        const commands = [
            'Create new session',
            'Switch to previous session',
            'Switch to next session',
            'Clear screen',
            'Toggle help menu',
            'Toggle command palette',
            // Add more commands here
        ];
        this.ui.updateCommandPalette(commands);
        this.ui.setupCommandPaletteEvents(this.handleCommandPaletteSelection.bind(this));
    }

    handleCommandPaletteSelection(command: string) {
        switch (command) {
            case 'Create new session':
                this.createNewSession();
                break;
            case 'Switch to previous session':
                this.switchToPreviousSession();
                break;
            case 'Switch to next session':
                this.switchToNextSession();
                break;
            case 'Clear screen':
                this.ui.clearScreen();
                break;
            case 'Toggle help menu':
                this.ui.toggleHelpMenu();
                break;
            case 'Toggle command palette':
                this.ui.toggleCommandPalette();
                break;
            default:
                this.ui.showTooltip(`Command not implemented: ${command}`);
        }
    }

    initializeHelpSystem() {
        const commands = [
            { name: 'Ctrl+N', description: 'Create new session' },
            { name: 'Ctrl+,', description: 'Switch to previous session' },
            { name: 'Ctrl+.', description: 'Switch to next session' },
            { name: 'Ctrl+L', description: 'Clear screen' },
            { name: 'F1', description: 'Toggle help menu' },
            // Add more commands here
        ];
        this.ui.updateHelpMenu(commands);
    }

    showContextHelp(topic?: string) {
        if (topic) {
            // Show context-sensitive help
            const helpText = this.getContextHelp(topic);
            this.ui.showTooltip(helpText);
        } else {
            // Toggle general help menu
            this.ui.toggleHelpMenu();
        }
    }

    getContextHelp(topic: string): string {
        // Implement logic to get context-sensitive help
        return `Help for ${topic}: ...`; // Placeholder
    }

    startStatusBarUpdates() {
        setInterval(() => {
            const activeSession = this.sessions[this.activeSessionIndex];
            const sessionInfo = `${activeSession.id} (${this.activeSessionIndex + 1}/${this.sessions.length})`;
            const activeTools = this.getActiveTools();
            const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
            const performance = os.loadavg()[0];
            this.ui.updateStatusBar(sessionInfo, activeTools, memoryUsage, performance);
        }, 1000);
    }

    getActiveTools() {
        // Implement logic to get currently active tools
        return ['Tool1', 'Tool2']; // Placeholder
    }

    initializeSessionManagement() {
        this.ui.screen.key(['C-n'], () => this.createNewSession());
        this.ui.screen.key(['C-,'], () => this.switchToPreviousSession());
        this.ui.screen.key(['C-.'], () => this.switchToNextSession());
    }

    initializeReadlineCompatibility() {
        this.readlineInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        });

        this.readlineInterface.question = (query: string, callback: (answer: string) => void) => {
            this.ui.updateOutput(query);
            this.ui.getInput().then(callback);
        };

        this.readlineInterface.write = (data: string) => {
            this.ui.updateOutput(data);
            return true;
        };

        this.readlineInterface.prompt = () => {
            this.ui.getInput().then((input) => {
                this.executeCommandInActiveSession(input);
            });
        }

        // Keep existing readline event listeners
        this.readlineInterface.on('line', (line: string) => {
            if (line.startsWith('.log')) {
                this.handleLogCommand(line);
            } else {
                this.executeCommandInActiveSession(line);
            }
        });

        this.readlineInterface.on('close', () => {
            log('info', 'Goodbye!', 'TerminalSessionManager');
            process.exit(0);
        });

        this.readlineInterface.on('SIGINT', () => {
            this.sessions[this.activeSessionIndex] && this.sessions[this.activeSessionIndex].interrupt();
        });
    }


    initializeReadline() {
        this.readlineInterface.prompt();
        this.readlineInterface.input.on('keypress', (str: string, key: any) => {
            if (key.ctrl && key.name === 'a') {
                this.commandMode = true;
            } else if (key.ctrl && key.name === 'c') {
                if (this.sessions[this.activeSessionIndex] && this.sessions[this.activeSessionIndex].working) {
                    this.sessions[this.activeSessionIndex].interrupt();
                    return;
                }
                log('info', 'Goodbye!', 'TerminalSessionManager');
                process.exit(0);
            } else if (this.commandMode && key.name === 'c') {
                this.switchToNextSession();
                this.commandMode = false;
            } else if (this.commandMode && key.name === 'n') {
                this.createNewSession();
                this.commandMode = false;
            }
        });

        this.readlineInterface.on('line', (line: string) => {
            if (line.startsWith('.log')) {
                this.handleLogCommand(line);
            } else {
                this.executeCommandInActiveSession(line);
            }
        }).on('close', () => {
            log('info', 'Goodbye!', 'TerminalSessionManager');
            process.exit(0);
        }).on('SIGINT', () => {
            this.sessions[this.activeSessionIndex] && this.sessions[this.activeSessionIndex].interrupt();
        });
    }

    handleLogCommand(command: string) {
        const [, subCommand, ...args] = command.split(' ');
        switch (subCommand) {
            case 'level':
                setLogLevel(args[0]);
                log('info', `Log level set to: ${args[0]}`, 'TerminalSessionManager');
                break;
            case 'enable':
                toggleService(args[0], true);
                log('info', `Logging enabled for service: ${args[0]}`, 'TerminalSessionManager');
                break;
            case 'disable':
                toggleService(args[0], false);
                log('info', `Logging disabled for service: ${args[0]}`, 'TerminalSessionManager');
                break;
            default:
                log('error', 'Invalid log command. Use: .log level <level> | .log enable <service> | .log disable <service>', 'TerminalSessionManager');
        }
    }

    createNewSession() {
        const newSession = new TerminalSession(this, this.chromaClient);
        this.sessions.push(newSession);
        this.activeSessionIndex = this.sessions.length - 1;
        this.switchToSession(this.activeSessionIndex, false);
        this.updateSessionOverview();
    }

    switchToPreviousSession() {
        if (this.sessions.length > 1) {
            this.activeSessionIndex = (this.activeSessionIndex - 1 + this.sessions.length) % this.sessions.length;
            this.switchToSession(this.activeSessionIndex);
        }
    }

    switchToNextSession() {
        if (this.sessions.length > 1) {
            this.activeSessionIndex = (this.activeSessionIndex + 1) % this.sessions.length;
            this.switchToSession(this.activeSessionIndex);
        }
    }

    async switchToSession(index: number, showPrompt: boolean = true) {
        this.activeSessionIndex = index;
        if (this.sessions[this.activeSessionIndex]) {
            await this.ui.fadeTransition();
            super.switchToSession(index);
            this.updateSessionOverview();
            this.ui.updateOutput(`Switched to session ${this.sessions[index].id}`);
            if (showPrompt) {
                this.readlineInterface.prompt();
            }
        }
    }

    updateSessionOverview() {
        const sessionOverview = this.sessions.map((session, index) => ({
            id: session.id,
            active: index === this.activeSessionIndex
        }));
        this.ui.updateSessionOverview(sessionOverview);
    }

    async executeCommandInActiveSession(command: string) {
        if (this.sessions.length === 0) {
            this.createNewSession();
        }
        const activeSession = this.sessions[this.activeSessionIndex];
        try {
            const result = await activeSession.execute(command);
            if (result.success) {
                this.ui.updateOutput(`Result: ${JSON.stringify(result.data)}`, 'aiResponse');
            } else {
                this.ui.updateOutput(`Error: ${result.error?.message}`, 'error');
            }
        } catch (error) {
            console.error('Error executing command:', error);
            this.ui.updateOutput(`Unexpected error: ${(error as Error).message}`, 'error');
        }
    }

    saveSessionState() {
        // this.sessions[this.activeSessionIndex].savedOutput = this.readlineInterface.output._buffer
        //     ? this.readlineInterface.output._buffer.toString()
        //     : '';
    }

    initializeUI() {
        this.ui.inputBox.key('enter', () => {
            const input = this.ui.inputBox.getValue().trim();
            if (input) {
                this.emit('input', input);
                this.ui.updateOutput(`> ${input}`, 'userInput');
                this.ui.inputBox.clearValue();
                this.executeCommandInActiveSession(input);
                this.ui.screen.render();
            }
        });

        // Display a welcome message
        this.ui.updateOutput('Welcome to the AI Assistant. Type your command or question below.', 'info');

        // Handle resize events
        this.ui.screen.on('resize', () => {
            this.ui.screen.render();
        });
    }
}

class TerminalSession extends AssistantSession {

    constructor(sessionManager: TerminalSessionManager, chromaClient: any) {
        super(sessionManager, chromaClient);
        this.setupUIHandlers();
        this.on('beforeExecuteCommand', (data: any) => {
            log('info', `${data.command}`, 'TerminalSession');
        });
        this.on('afterExecuteCommand', (data: any) => {
            if (data.success) {
                log('info', `Result: ${data.data}`, 'TerminalSession');
            } else {
                log('error', `Error: ${data.error}`, 'TerminalSession');
            }
            (this.sessionManager as TerminalSessionManager).readlineInterface.prompt();
        });
        this.on('taskComplete', (data) => {
            log('info', `Task completed: ${data.task.name}`, 'TerminalSession');
            log('info', `Result: ${data.result}`, 'TerminalSession');
        });

        this.on('toolUpdated', (data) => {
            log('info', `Tool updated: ${data.name}`, 'TerminalSession');
        });
    }

    async execute(command: string): Promise<{ success: boolean; data: any; error?: undefined; } | { success: boolean; error: Error; data?: undefined; }> {
        try {
            this.history.push(command);
            this.working = true;

            this.emit('beforeExecuteCommand', { command });

            // Call the agent with the input
            const result = await this.callAgent(command);

            const workflowResult: WorkflowResult = result.success !== undefined
                ? result as WorkflowResult
                : { success: true, data: result };

            this.emit('afterExecuteCommand', workflowResult);

            return workflowResult as any;
        } catch (error) {
            console.error('Error in TerminalSession execute:', error);
            const errorResult: WorkflowResult = { success: false, error: error as Error };
            this.emit('afterExecuteCommand', errorResult);
            return errorResult as any;
        } finally {
            this.working = false;
            this.emit('show-prompt');
        }
    }

    async callAgent(input: string, model = 'claude', resultVar?: string) {
        const sm: any = this.sessionManager;
        sm.ui.startSpinner('AI is thinking...');
        try {
            const result = await super.callAgent(input, model, resultVar);
            sm.ui.stopSpinner();
            return result;
        } catch (error) {
            sm.ui.stopSpinner();
            throw error;
        }
    }

    setupHandlers() {
        super.setupHandlers();
        this.on('ready', (error: any) => {
            this.onPrompt();
        });
        this.on('interrupt', (error: any) => {
            this.onInterrupt();
        });
    }

    setupUIHandlers() {
        let sm = this.sessionManager as any;

        this.on('beforeExecuteCommand', (data: any) => {
            sm.ui.updateOutput(`Executing: ${data.command}`, 'userInput');
        });

        this.on('afterExecuteCommand', (data: any) => {
            if (data.success) {
                sm.ui.updateOutput(`Result:`, 'success');
                sm.ui.displayBoxedContent(JSON.stringify(data.data, null, 2), 'Command Result');
            } else {
                sm.ui.updateOutput(`Error: ${data.error}`, 'error');
            }
        });

        this.on('taskComplete', (data: any) => {
            sm.updateOutput(`Task completed: ${data.task.name}`, 'success');
            sm.displayBoxedContent(JSON.stringify(data.result, null, 2), 'Task Result');
        });

        this.on('toolUpdated', (data: any) => {
            sm.updateOutput(`Tool updated: ${data.name}`, 'success');
        });

        this.on('ready', (error: any) => {
            this.onPrompt();
        });

        this.on('codeOutput', (data: any) => {
            sm.updateOutput(data.code, 'code');
        });
    }

    log(level: string, message: string, service: string) {
        const formattedMessage = `[${service}] ${level.toUpperCase()}: ${message}`;
        (this.sessionManager as TerminalSessionManager).ui.updateOutput(formattedMessage);
    }

    onSessionComplete({ message }: any) {
        // const llmResponse = await this.callTool('callLLM', {
        //     system_prompt: 'Format the given text using markdown to make it more readable.',
        //     prompt: JSON.stringify(result)
        // });
        log('info', message, 'TerminalSession');
        (this.sessionManager as TerminalSessionManager).readlineInterface.prompt();

    }

    async startProgressBar(total: number) {
        (this.sessionManager as TerminalSessionManager).ui.startProgressBar(total);
    }

    async updateProgressBar(value: number) {
        (this.sessionManager as TerminalSessionManager).ui.updateProgressBar(value);
    }

    async stopProgressBar() {
        (this.sessionManager as TerminalSessionManager).ui.stopProgressBar();
    }

    async executeSpecialCommand(command: string) {
        super.executeSpecialCommand(command);
        switch (command) {
            case '.state':
                this.showState();
                break;
            case '.exit':
                this.exitSession();
                break;
            default:
                log('error', `Unknown command: ${command}`, 'TerminalSession');
        }
        (this.sessionManager as TerminalSessionManager).readlineInterface.prompt();
    }

    onBeforeEvent(data: any) {
        //this.spinner.stop();
        if (this.debug) {
            log('debug', JSON.stringify(data, null, 2), 'TerminalSession');
        }
    }

    onPrompt() {
        (this.sessionManager as TerminalSessionManager).readlineInterface.prompt();
    }

    onInterrupt() {
        if (!this.working) {
            log('info', 'Goodbye!', 'TerminalSession');
            process.exit(0);
        }
        this.removeAllListeners();
        this.sessionManager.sessions = this.sessionManager.sessions.filter((session) => session.id !== this.id);
        this.sessionManager.activeSessionIndex = 0;
        this.sessionManager.switchToSession(0);

        log('info', 'Session interrupted.', 'TerminalSession');
    }

    restoreSessionState() {
        // Restore the saved output and print it to the console
        process.stdout.write(this.savedOutput);
        this.printHistory();
    }

    showHelp() {
        const helpText = `
          Commands:
              .help\t\tShow this help message
              .debug\tToggle debug mode on/off
              .history\tShow command history for this session
              .state\t\tShow current state of the session
              .exit\t\tExit this session
              Ctrl+A\t\tCreate a new session
              Ctrl+C\t\tSwitch to the next session
              .log level <level>\tSet the log level (error, warn, info, debug, verbose)
              .log enable <service>\tEnable logging for a specific service
              .log disable <service>\tDisable logging for a specific service
          `;
        log('info', boxen(helpText, { padding: 1 }), 'TerminalSession');
        return helpText;
    }

    toggleDebug() {
        this.debug = !this.debug;
        log('info', `Debug mode is now ${this.debug ? 'on' : 'off'}`, 'TerminalSession');
    }

    printHistory() {
        if (this.history.length === 0) {
            log('info', 'This session has no history yet.', 'TerminalSession');
            return;
        }
        log('info', 'Session History:', 'TerminalSession');
        this.history.forEach((command, index) => {
            log('info', `${index + 1}. ${command}`, 'TerminalSession');
        });
    }

    showState() {
        const state = {
            id: this.id,
            debug: this.debug,
            history: this.history
        };
        log('info', boxen(JSON.stringify(state, null, 2), { padding: 1 }), 'TerminalSession');
    }

    exitSession() {
        this.removeAllListeners();
        this.sessionManager.sessions = this.sessionManager.sessions.filter((session) => session.id !== this.id);
        this.sessionManager.activeSessionIndex = 0;
        this.sessionManager.switchToSession(0);
    }

    async handleToolCommand(args: string[]) {
        const [subCmd, ...subArgs] = args;

        switch (subCmd) {
            case 'list':
                this.listTools();
                break;
            case 'add':
                await this.addTool(subArgs);
                break;
            case 'update':
                await this.updateTool(args[0], args[1]); // args[0] = name, args[1] = source file
                break;
            case 'rollback':
                await this.rollbackTool(args[0], args[1]); // args[0] = name, args[1] = version
                break;
            case 'history':
                await this.showToolHistory(subArgs);
                break;
            case 'help':
            default:
                this.showToolHelp();
        }
    }

    // Call a tool with error handling and fallback strategies
    async callTool(toolName: string, params: any) {
        return super.callTool(toolName, params);
    }

    async listTools() {
        const tools = await this.sessionManager.getToolList();
        log('info', chalk.bold("Available tools:"), 'TerminalSession');
        tools.forEach((tool: any) => {
            log('info', `  ${chalk.cyan(tool.name)} (v${tool.version})`, 'TerminalSession');
        });
        return tools.map((tool: any) => tool.name);
    }

    async addTool(args: string[]) {
        if (args.length < 2) {
            log('error', "Usage: .tool add <name> <source_file> <schema> [tag1,tag2,...]", 'TerminalSession');
            return;
        }

        const [name, sourceFile, schema, tagsString] = args;
        const tags = tagsString ? tagsString.split(',') : [];

        try {
            const source: any = fs.readFileSync(sourceFile, 'utf8');
            const added = await this.sessionManager.addTool(name, source, schema, tags);
            if (added) {
                log('info', chalk.green(`Tool '${name}' added successfully.`), 'TerminalSession');
            } else {
                log('warn', chalk.yellow(`Tool '${name}' already exists.`), 'TerminalSession');
            }
        } catch (error) {
            log('error', chalk.red(`Error adding tool: ${error.message}`), 'TerminalSession');
        }
    }

    async createToolSchema(source: string) {
        const schema = this.sessionManager.createToolSchema(source);
        return schema;
    }

    async updateTool(name: string, sourceFile: string): Promise<boolean> {
        if (arguments.length < 2) {
            log('error', "Usage: .tool update <name> <source_file>", 'TerminalSession');
            return false;
        }

        try {
            // get the current tool
            const tool = await this.sessionManager.getTool(name);

            const source: any = await fs.promises.readFile(sourceFile, 'utf8');
            const updated: any = await this.sessionManager.updateTool(name, source, tool.schema, tool.tags);
            if (updated) {
                log('info', chalk.green(`Tool '${name}' updated successfully.`), 'TerminalSession');
            } else {
                log('warn', chalk.yellow(`Tool '${name}' not found.`), 'TerminalSession');
            }
            return updated;
        } catch (error) {
            log('error', chalk.red(`Error updating tool: ${error.message}`), 'TerminalSession');
            return false;
        }
    }

    async rollbackTool(name: string, version: string): Promise<boolean> {
        if (arguments.length < 2) {
            log('error', "Usage: .tool rollback <name> <version>", 'TerminalSession');
            return false;
        }
        try {
            const rolledBack: any = await this.sessionManager.rollbackTool(name, version);
            if (rolledBack) {
                log('info', chalk.green(`Tool '${name}' rolled back to version ${version} successfully.`), 'TerminalSession');
            } else {
                log('warn', chalk.yellow(`Failed to rollback tool '${name}' to version ${version}.`), 'TerminalSession');
            }
            return rolledBack;
        } catch (error) {
            log('error', chalk.red(`Error rolling back tool: ${error.message}`), 'TerminalSession');
            return false;
        }
    }

    showToolHelp() {
        const toolHelp = `
        Tool management commands:
        .tool list\t\t\tList all available tools
        .tool add <name> <file> [tags]\tAdd a new tool
        .tool update <name> <file>\tUpdate an existing tool
        .tool rollback <name> <version>\tRollback a tool to a specific version
        .tool history <name>\t\tShow version history of a tool
        `;
        log('info', boxen(toolHelp, { padding: 1 }), 'TerminalSession');
        return toolHelp;
    }

    interrupt() {
        this.emit('interrupt');
    }

    // Execute a JavaScript script with retry and error handling using vm2
    async callScript(script: string, retryLimit: number = 10): Promise<any> {
        //this.spinner.text = 'Executing script...';
        // this.spinner.start();
        try {
            const result = await super.callScript(script, retryLimit);
            return result;
        } finally {
            //this.spinner.stop();
        }
    }
}


const client = new ChromaClient({
    path: 'http://localhost:8000',
});

// Main execution
const sessionManager = new TerminalSessionManager(client);

// This line is crucial - it starts rendering the UI
sessionManager.ui.screen.render();

// Handle command-line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
    log('info', chalk.bold.yellow(`AI Assistant CLI Version ${packageJson.version}`), 'Main');
    log('info', chalk.yellow("Type '.help' for instructions."), 'Main');
    sessionManager.readlineInterface.prompt();
} else {
    const assistant = new Assistant(sessionManager, sessionManager.chromaClient);
    const maintenanceManager = new MaintenanceManager(
        assistant,
        sessionManager,
        assistant.memoryStore
    );
    setInterval(() => {
        maintenanceManager.performMaintenance();
    }, 24 * 60 * 60 * 1000);
    const query = args.join(' ');
    assistant.callAgent(query).then((response) => {
        process.exit(0);
    }).catch((error) => {
        log('error', error, 'Main');
        process.exit(1);
    })
}
