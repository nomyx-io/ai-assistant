import Assistant from "./assistant/assistant";
import { AssistantSessionManager, AssistantSession } from "./assistant/index";
import { MaintenanceManager } from './assistant/maintenance';
import chalk from "chalk";
import boxen from "boxen";
import * as packageJson from "../package.json";
import fs from 'fs';
import { ChromaClient } from "chromadb";
import { tools } from "./assistant/tools";
import ajv from 'ajv';
import { Tool, toolRegistryTools } from "./assistant/tool_registry";
import { log, setLogLevel, toggleService } from './logger';
import { UI } from "./ui";
import os from 'os';
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
    let llmResponse = await api.conversation.chat([{
        "role": "system",
        "content": "Analyze the file operation error and suggest a fix."
    }, {
        "role": "user",
        "content": JSON.stringify
    }])
    llmResponse = llmResponse[0].content;
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
        }
    }

    // constructor(public chromaClient: ChromaClient) {

    //     super(chromaClient);
    //     this.ui = new UI();
    //     this.initializeSessionManagement();
    //     this.startStatusBarUpdates();
    //     this.initializeThemeSupport();

    //     readline.emitKeypressEvents(process.stdin);
    //     if (process.stdin.isTTY) process.stdin.setRawMode(true);

    //     this.addTool('wait_for_keypress', this.extraTools.wait_for_keypress.execute.toString(), this.extraTools.wait_for_keypress.schema, ['utility']);
    //     this.addTool('list_tools', toolRegistryTools.list_tools.execute.toString(), toolRegistryTools.list_tools.schema, ['utility']);
    //     this.addTool('add_tool', toolRegistryTools.add_tool.execute.toString(), toolRegistryTools.add_tool.schema, ['utility']);
    //     this.addTool('update_tool', toolRegistryTools.update_tool.execute.toString(), toolRegistryTools.update_tool.schema, ['utility']);
    //     this.addTool('delete_tool', toolRegistryTools.delete_tool.execute.toString(), toolRegistryTools.delete_tool.schema, ['utility']);
    //     this.addTool('get_tool_metadata', toolRegistryTools.get_tool_metadata.execute.toString(), toolRegistryTools.get_tool_metadata.schema, ['utility']);
    //     this.addTool('update_tool_metadata', toolRegistryTools.update_tool_metadata.execute.toString(), toolRegistryTools.update_tool_metadata.schema, ['utility']);
    //     this.addTool('get_tool_performance', toolRegistryTools.get_tool_performance.execute.toString(), toolRegistryTools.get_tool_performance.schema, ['utility']);
    //     this.addTool('get_all_performance_metrics', toolRegistryTools.get_all_performance_metrics.execute.toString(), toolRegistryTools.get_all_performance_metrics.schema, ['utility']);
    //     this.addTool('run_maintenance', toolRegistryTools.run_maintenance.execute.toString(), toolRegistryTools.run_maintenance.schema, ['utility']);
    //     this.addTool('analyze_and_create_tool', toolRegistryTools.analyze_and_create_tool.execute.toString(), toolRegistryTools.analyze_and_create_tool.schema, ['utility']);
    //     this.addTool('predict_likely_tools', toolRegistryTools.predict_likely_tools.execute.toString(), toolRegistryTools.predict_likely_tools.schema, ['utility']);
    //     this.addTool('get_tool_history', toolRegistryTools.get_tool_history.execute.toString(), toolRegistryTools.get_tool_history.schema, ['utility']);
    //     this.addTool('rollback_tool', toolRegistryTools.rollback_tool.execute.toString(), toolRegistryTools.rollback_tool.schema, ['utility']);
    //     this.addTool('generate_tool_report', toolRegistryTools.generate_tool_report.execute.toString(), toolRegistryTools.generate_tool_report.schema, ['utility']);

    //     const toolList = Object.values(tools);
    //     toolList.forEach((tool) => {
    //         this.addTool(tool.name, tool.execute.toString(), tool.schema, tool.tags);
    //     });

    //     setTimeout(async () => {
    //         this.sessions[this.activeSessionIndex] && this.sessions[this.activeSessionIndex].emit('text', 'running self-improvement tasks...')
    //         await this.generateAndRunTests();
    //         await this.improveTools();
    //     }, 60000);

    //     
    // }
    constructor(public chromaClient: ChromaClient) {
        super(chromaClient);
        this.ui = new UI();
        this.initializeSessionManagement();
        this.startStatusBarUpdates();
        this.initializeThemeSupport();
        this.initializeInputHandler();
        this.registerExtraTools();
    }


    private initializeInputHandler() {
        this.ui.readlineInterface.on('line', (line: string) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('.theme')) {
                const themeName = trimmedLine.split(' ')[1];
                this.ui.switchTheme(themeName);
            } else if (trimmedLine === '.history') {
                this.showHistory();
            } else if (trimmedLine === '.clear') {
                console.clear();
            } else if (trimmedLine === '.help') {
                this.showHelp();
            } else if (trimmedLine === '.exit') {
                this.exitSession();
            } else if (trimmedLine.startsWith('.tools')) {
                const args = trimmedLine.split(' ').slice(1);
                this.handleToolCommand(args);
            } else {
                this.executeCommandInActiveSession(line);
                this.commandHistory.push(line);
                this.currentHistoryPage = Math.ceil(this.commandHistory.length / this.itemsPerPage);
            }
        });
    }


    private registerExtraTools() {
        const extraTools = {
            wait_for_keypress: {
                name: 'wait_for_keypress',
                version: '1.0.0',
                description: 'Pauses execution until the user presses a key.',
                schema: {
                    name: 'wait_for_keypress',
                    description: 'Pauses execution until the user presses a key.',
                    methodSignature: "wait_for_keypress(resultVar?: string): string",
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
            busybox2: {
                name: 'files',
                version: '1.0.0',
                description: 'Performs file operations.',
                schema: {
                    name: 'busybox2',
                    description: 'Performs file operations.',
                    methodSignature: "files(operations: { operation: string, path?: string, match?: string, data?: string, position?: number, target?: string }[]): string",
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
        };

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
        //this.addTool('busybox2', this.extraTools.busybox2.execute.toString(), this.extraTools.busybox2.schema, ['utility']);

        // Register toolRegistryTools
        Object.entries(toolRegistryTools).forEach(([name, tool]) => {
            this.addTool(name, tool.execute.toString(), tool.schema, ['utility']);
        });
        Object.entries(tools).forEach(([name, tool]) => {
            this.addTool(name, tool.execute.toString(), tool.schema, ['utility']);
        });
    }

    initializeThemeSupport() {
        // this.ui.readlineInterface.on('line', (line: string) => {
        //     if (line.startsWith('.theme')) {
        //         const themeName = line.split(' ')[1];
        //         this.ui.switchTheme(themeName);
        //     } else {
        //         this.executeCommandInActiveSession(line);
        //     }
        // });
    }

    initializeHistoryBrowser() {
        // const commands = [
        //     '.history - Show command history',
        //     '.clear - Clear the screen',
        //     '.help - Show this help message',
        //     '.exit - Exit the current session',
        //     '.tools - Manage tools'
        // ];
        // this.ui.readlineInterface.on('line', (line: string) => {
        //     if (line.trim() === '.history') {
        //         this.showHistory();
        //     } else if (line.trim() === '.clear') {
        //         console.clear();
        //     } else if (line.trim() === '.help') {
        //         this.showHelp();
        //     } else if (line.trim() === '.exit') {
        //         this.exitSession();
        //     } else if (line.trim().startsWith('.tools')) {
        //         const args = line.trim().split(' ').slice(1);
        //         this.handleToolCommand(args);
        //     } else {
        //         this.executeCommandInActiveSession(line);
        //         this.commandHistory.push(line);
        //         this.currentHistoryPage = Math.ceil(this.commandHistory.length / this.itemsPerPage);
        //     }
        // });
    }

    showHistory() {
        if (this.commandHistory.length === 0) {
            this.ui.updateOutput('No commands in history.', 'info');
            return;
        }
        const startIndex = (this.currentHistoryPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.commandHistory.length);
        for (let i = startIndex; i < endIndex; i++) {
            this.ui.updateOutput(`${i + 1}. ${this.commandHistory[i]}`, 'info');
        }
    }

    initializeSessionManagement() {
        this.createNewSession();
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
            super.switchToSession(index);
            this.ui.updateOutput(`Switched to session ${this.sessions[index].id}`);
            if (showPrompt) {
                this.ui.readlineInterface.prompt();
            }
        }
    }


    async executeCommandInActiveSession(command: string) {
        if (this.sessions.length === 0) {
            this.createNewSession();
        }
        const activeSession = this.sessions[this.activeSessionIndex] as TerminalSession;
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
        // Implementation removed as it was related to blessed
    }

    startStatusBarUpdates() {
        setInterval(() => {
            const activeSession = this.sessions[this.activeSessionIndex];
            const sessionInfo = `${activeSession.id} (${this.activeSessionIndex + 1}/${this.sessions.length})`;
            const activeTools = this.getActiveTools();
            const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
            const performance = os.loadavg()[0];
            this.ui.updateOutput(`Session: ${sessionInfo} | Active Tools: ${activeTools.join(', ')} | Memory: ${memoryUsage.toFixed(2)}MB | Performance: ${performance.toFixed(2)}ms`, 'info');
        }, 10000);
    }

    getActiveTools() {
        // Implement logic to get currently active tools
        return ['Tool1', 'Tool2']; // Placeholder
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
        this.ui.updateOutput(boxen(helpText, { padding: 1 }));
    }

    exitSession() {
        this.sessions[this.activeSessionIndex].emit('interrupt');
    }

    async handleToolCommand(args: string[]) {
        const [subCmd, ...subArgs] = args;

        switch (subCmd) {
            case 'list':
                this.listTools();
                break;
            case 'add':
                await this.addTool(subArgs[0], subArgs[1], subArgs[2], subArgs.slice(3)); // args[0] = name, args[1] = source file, args[2] = schema, args[3] = tags
                break;
            case 'update':
                await this.updateTool(args[0], args[1]); // args[0] = name, args[1] = source file
                break;
            case 'rollback':
                await this.rollbackTool(args[0], args[1]); // args[0] = name, args[1] = version
                break;
            case 'history':
                await this.showToolHistory(subArgs[0]); // args[0] = name
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
        const tools = await this.getToolList();
        this.ui.updateOutput(chalk.bold("Available tools:"));
        tools.forEach((tool: any) => {
            this.ui.updateOutput(` ${chalk.cyan(tool.name)} (v${tool.version})`);
        });
        return tools.map((tool: any) => tool.name);
    }


    async addTool(name: string, source: string, schema: any, tags: string[]): Promise<boolean> {
        try {
            const added = await super.addTool(name, source, schema, tags);
            if (added) {
                log('info', chalk.green(`Tool '${name}' added successfully.`), 'TerminalSession');
            } else {
                log('warn', chalk.yellow(`Tool '${name}' already exists.`), 'TerminalSession');
            }
        } catch (error) {
            log('error', chalk.red(`Error adding tool: ${error.message}`), 'TerminalSession');
            return false;
        }

        return true;
    }

    async createToolSchema(source: string) {
        const schema = this.createToolSchema(source);
        return schema;
    }

    async updateTool(name: string, sourceFile: any): Promise<boolean> {
        if (arguments.length < 2) {
            this.ui.updateOutput("Usage: .tool update <name> <source_file>", 'error');
            return false;
        }

        try {
            // get the current tool
            const tool: Tool = await this.getTool(name);
            tool.source = sourceFile.improvedFunction;
            // we need to recreate the schema
            const schema = await this.createToolSchema(sourceFile.improvedFunction);

            // update the tool
            tool.schema = schema;
            const updated: any = await tool.saveTool();

            if (updated) {
                this.ui.updateOutput(`Tool '${name}' updated successfully.`, 'success');
            } else {
                this.ui.updateOutput(`Tool '${name}' not found.`, 'warning');
            }
            return updated;
        } catch (error) {
            this.ui.updateOutput(`Error updating tool: ${error.message}`, 'error');
            return false;
        }
    }

    async showToolHistory(name: string) {
        if (arguments.length < 1) {
            this.ui.updateOutput("Usage: .tool history <name>", 'error');
            return;
        }
        try {
            const history = await this.getToolHistory(name);
            this.ui.updateOutput(`Version history for tool '${name}':`);
            history.forEach((version: any) => {
                this.ui.updateOutput(` v${version.version} - ${version.date}`);
            });
        } catch (error) {
            this.ui.updateOutput(`Error getting tool history: ${error.message}`, 'error');
        }
    }

    async rollbackTool(name: string, version: string): Promise<boolean> {
        if (arguments.length < 2) {
            this.ui.updateOutput("Usage: .tool rollback <name> <version>", 'error');
            return false;
        }
        try {
            const rolledBack: any = await this.rollbackTool(name, version);
            if (rolledBack) {
                this.ui.updateOutput(`Tool '${name}' rolled back to version ${version} successfully.`, 'success');
            } else {
                this.ui.updateOutput(`Failed to rollback tool '${name}' to version ${version}.`, 'warning');
            }
            return rolledBack;
        } catch (error) {
            this.ui.updateOutput(`Error rolling back tool: ${error.message}`, 'error');
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
        this.ui.updateOutput(boxen(toolHelp, { padding: 1 }));
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
            (this.sessionManager as TerminalSessionManager).ui.readlineInterface.prompt();
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
        try {
            const result = await super.callAgent(input, model, resultVar);
            return result;
        } catch (error) {
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
        log('info', message, 'TerminalSession');
        (this.sessionManager as TerminalSessionManager).ui.readlineInterface.prompt();
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
        (this.sessionManager as TerminalSessionManager).ui.readlineInterface.prompt();
    }

    onBeforeEvent(data: any) {
        if (this.debug) {
            log('debug', JSON.stringify(data, null, 2), 'TerminalSession');
        }
    }

    onPrompt() {
        (this.sessionManager as TerminalSessionManager).ui.readlineInterface.prompt();
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
            log('info', ` ${chalk.cyan(tool.name)} (v${tool.version})`, 'TerminalSession');
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
        try {
            const result = await super.callScript(script, retryLimit);
            return result;
        } finally {
            // No spinner to stop in this version
        }
    }
}


const client = new ChromaClient({
    path: 'http://localhost:8000',
});

// Main execution
const sessionManager = new TerminalSessionManager(client);

// Handle command-line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
    log('info', chalk.bold.yellow(`AI Assistant CLI Version ${packageJson.version}`), 'Main');
    log('info', chalk.yellow("Type '.help' for instructions."), 'Main');
    sessionManager.ui.readlineInterface.prompt();
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
