
import Assistant from "./assistant/assistant";
import { CoreWorkflow, WorkflowResult } from "./assistant/workflow";
import { AssistantSessionManager, AssistantSession } from "./assistant/index";
import chalk from "chalk";
import boxen from "boxen";
import { confirmExecution } from './assistant/confirmation';
import readline from 'readline';
import * as packageJson from "../package.json";
import fs from 'fs';
import ToolRegistry, { IToolRegistry } from "./assistant/tool_registry";
import { ChromaClient } from "chromadb";
import { debugLog } from "./assistant/errorLogger";
import { Tool } from "./assistant/types";

interface RegistryManagementParams {
    action: 'list' | 'add' | 'update' | 'rollback' | 'history';
    name?: string;
    source?: string;
    tags?: string[];
    version?: string;
}


async function listTools(assistant: Assistant): Promise<Tool[]> {
    debugLog('Listing all tools...');
    return assistant.toolRegistry.getToolList();
}

async function addTool(assistant: Assistant, name: string, source: string, schema: any, tags: string[] = []): Promise<boolean> {
    debugLog(`Adding tool: ${name} with source: ${source} and tags: ${tags}`);
    return assistant.toolRegistry.addTool(name, source, schema, tags);
}

async function updateTool(assistant: Assistant, name: string, source: string): Promise<boolean> {
    debugLog(`Updating tool: ${name} with source: ${source}`);
    return assistant.updateTool(name, source);
}

async function rollbackTool(assistant: Assistant, name: string, version: string): Promise<boolean> {
    debugLog(`Rolling back tool: ${name} to version: ${version}`);
    return assistant.rollbackTool(name, version);
}

async function getToolHistory(assistant: Assistant, name: string): Promise<string[]> {
    debugLog(`Getting history for tool: ${name}`);
    return assistant.toolRegistry.getToolHistory(name);
}

class TerminalSessionManager extends AssistantSessionManager {

    readlineInterface: any;

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
        registry_management: {
            name: 'registry_management',
            version: '1.0.0',
            description: 'Manage the tool registry',
            schema: {
                "description": "Manage the tool registry",
                "methodSignature": "registryManagementTool(params: { action: 'list' | 'add' | 'update' | 'rollback' | 'history'; name?: string; source?: string; tags?: string[]; version?: string; }): any",
            },
            execute: async (assistant: Assistant, params: RegistryManagementParams) => {
                debugLog(`registryManagementTool called with params: ${JSON.stringify(params)}`);
                // Display confirmation before adding the tool
                const confirmed = await confirmExecution(assistant, `Add tool '\${name}' with the provided source and tags?`);
                if (!confirmed) {
                    return false;
                }
                const { action, name, source, tags, version } = params;
                switch (action) {
                    case 'list':
                        return listTools(assistant);
                    case 'add':
                        return addTool(assistant, name!, source!, tags);
                    case 'update':
                        return updateTool(assistant, name!, source!);
                    case 'rollback':
                        return rollbackTool(assistant, name!, version!);
                    case 'history':
                        return getToolHistory(assistant, name!);
                    default:
                        throw new Error(`Invalid action: ${action}`);
                }
            }
        }
    }

    constructor(public chromaClient: ChromaClient) {
        super(chromaClient);
        this.readlineInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        });
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        this.initializeReadline();
        for(const toolName in Object.keys(this.extraTools)) {
            this.addTool(toolName, this.extraTools[toolName].execute.toString(), this.extraTools[toolName].schema, this.extraTools[toolName].tags);
        }
        setTimeout(async () => {
            this.sessions[this.activeSessionIndex] && this.sessions[this.activeSessionIndex].emit('text', 'running self-improvement tasks...')
            await this.generateAndRunTests();
            await this.improveTools();
        }, 60000);
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
                this.emit('text', 'Goodbye!');
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
            this.executeCommandInActiveSession(line);
        }).on('close', () => {
            this.emit('text', 'Goodbye!');
            process.exit(0);
        }).on('SIGINT', () => {
            this.sessions[this.activeSessionIndex] && this.sessions[this.activeSessionIndex].interrupt();
        });
    }

    createNewSession() {
        const newSession = new TerminalSession(this, this.chromaClient);
        ToolRegistry.getInstance(newSession);
        this.sessions.push(newSession);
        this.activeSessionIndex = this.sessions.length - 1;
        this.switchToSession(this.activeSessionIndex, false);
    }

    switchToNextSession() {
        this.saveSessionState();
        this.activeSessionIndex = (this.activeSessionIndex + 1) % this.sessions.length;
        this.switchToSession(this.activeSessionIndex);
    }

    switchToSession(index: number, showPrompt: boolean = true) {
        this.activeSessionIndex = index;
        if (this.sessions[this.activeSessionIndex]) {
            console.clear();
            showPrompt && console.log(`\n--- Switched to session ${this.activeSessionIndex} ---`);
            this.sessions[this.activeSessionIndex].restoreSessionState();
            this.readlineInterface.prompt();
        }
    }

    executeCommandInActiveSession(command: string) {
        if (this.sessions.length === 0) {
            this.createNewSession();
        }
        this.sessions[this.activeSessionIndex].execute(command);
    }

    saveSessionState() {
        // Check if _buffer is defined before accessing toString()
        this.sessions[this.activeSessionIndex].savedOutput = this.readlineInterface.output._buffer
            ? this.readlineInterface.output._buffer.toString()
            : '';
    }
}


class TerminalSession extends AssistantSession {

    constructor(sessionManager: TerminalSessionManager, chromaClient: any) {
        super(sessionManager, chromaClient);
        this.on('beforeExecuteCommand', (data: any) => {
            console.log(chalk.cyan(`${data.command}`));
        });
        this.on('afterExecuteCommand', (data: any) => {
            if (data.success) {
                console.log(chalk.green('Result:'), data.data);
            } else {
                console.error(chalk.red('Error:'), data.error);
            }
            (this.sessionManager as TerminalSessionManager).readlineInterface.prompt();
        });
        this.on('taskComplete', (data) => {
            console.log(chalk.green(`Task completed: ${data.task.name}`));
            console.log(chalk.cyan('Result:'), data.result);
        });

        this.on('toolUpdated', (data) => {
            console.log(chalk.yellow(`Tool updated: ${data.name}`));
        });
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

    onSessionComplete({ message }: any) {
        // const llmResponse = await this.callTool('callLLM', {
        //     system_prompt: 'Format the given text using markdown to make it more readable.',
        //     prompt: JSON.stringify(result)
        // });
        console.log(message);
        (this.sessionManager as TerminalSessionManager).readlineInterface.prompt();
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
                console.log(`Unknown command: ${command}`);
        }
        (this.sessionManager as TerminalSessionManager).readlineInterface.prompt();
    }

    onBeforeEvent(data: any) {
        if (this.debug) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    onPrompt() {
        (this.sessionManager as TerminalSessionManager).readlineInterface.prompt();
    }

    onInterrupt() {
        if (!this.working) {
            console.log('Goodbye!');
            process.exit(0);
        }
        this.removeAllListeners();
        this.sessionManager.sessions = this.sessionManager.sessions.filter((session) => session.id !== this.id);
        this.sessionManager.activeSessionIndex = 0;
        this.sessionManager.switchToSession(0);

        console.log('Session interrupted.');
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
            `;
        this.emit('text', (boxen(helpText, { padding: 1 })));
        return helpText;
    }

    toggleDebug() {
        this.debug = !this.debug;
        //console.log(`Debug mode is now ${this.debug ? 'on' : 'off'}`);
        this.emit('text', `Debug mode is now ${this.debug ? 'on' : 'off'}`);
    }

    printHistory() {
        if (this.history.length === 0) {
            // console.log('This session has no history yet.');
            this.emit('text', 'This session has no history yet.');
            return;
        }
        // console.log(`Session History:`);
        this.emit('text', 'Session History:');
        this.history.forEach((command, index) => {
            console.log(`${index + 1}. ${command}`);
        });
    }

    showState() {
        const state = {
            id: this.id,
            debug: this.debug,
            history: this.history
        };
        this.emit('text', (boxen(JSON.stringify(state, null, 2), { padding: 1 })));
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
        const toolRegistry = ToolRegistry.getInstance(this);
        const tools = await toolRegistry.getToolList();
        this.emit('text', chalk.bold("Available tools:"));
        tools.forEach((tool: any) => {
            this.emit('text', `  ${chalk.cyan(tool.name)} (v${tool.version})`);
        });
        return tools.map((tool: any) => tool.name);
    }

    async addTool(args: string[]) {
        if (args.length < 2) {
            this.emit('text', "Usage: .tool add <name> <source_file> <schema> [tag1,tag2,...]");
            return;
        }

        const [name, sourceFile, schema, tagsString] = args;
        const tags = tagsString ? tagsString.split(',') : [];

        try {
            const source: any = fs.readFileSync(sourceFile, 'utf8');
            const toolRegistry = ToolRegistry.getInstance(this);
            const added = await toolRegistry.addTool(name, source, schema, tags);
            if (added) {
                this.emit('text', chalk.green(`Tool '${name}' added successfully.`));
            } else {
                this.emit('text', chalk.yellow(`Tool '${name}' already exists.`));
            }
        } catch (error) {
            //console.error(chalk.red(`Error adding tool: ${error.message}`));
            this.emit('text', chalk.red(`Error adding tool: ${error.message}`));
        }
    }

    async createToolSchema(source: string) {
        const toolRegistry = ToolRegistry.getInstance(this);
        const schema = toolRegistry.createToolSchema(source);
        return schema;
    }

    async updateTool(name: string, sourceFile: string): Promise<boolean> {
        if (args.length < 2) {
            //console.log("Usage: .tool update <name> <source_file>");
            this.emit('text', "Usage: .tool update <name> <source_file>");
            return;
        }

        try {
            const source: any = await fs.readFileSync(sourceFile, 'utf8');
            const updated: any = await this.updateTool(name, source);
            if (updated) {
                //console.log(chalk.green(`Tool '${name}' updated successfully.`));
                this.emit('text', chalk.green(`Tool '${name}' updated successfully.`));
            } else {
                //console.log(chalk.yellow(`Tool '${name}' not found.`));
                this.emit('text', chalk.yellow(`Tool '${name}' not found.`));
            }
        } catch (error) {
            console.error(chalk.red(`Error updating tool: ${error.message}`));
        }
    }

    async rollbackTool(name: string, version: string): Promise<boolean> {
        if (args.length < 2) {
            console.log("Usage: .tool rollback <name> <version>");
            return;
        }
        try {
            const rolledBack: any = await this.rollbackTool(name, version);
            if (rolledBack) {
                console.log(chalk.green(`Tool '${name}' rolled back to version ${version} successfully.`));
            } else {
                console.log(chalk.yellow(`Failed to rollback tool '${name}' to version ${version}.`));
            }
        } catch (error) {
            console.error(chalk.red(`Error rolling back tool: ${error.message}`));
        }
    }

    showToolHelp() {
        const toolHelp = `
        Tool management commands:
            .tool list\t\t\tList all available tools
            .tool add <name> <file> [tags]\tAdd a new tool
            .tool update <name> <file>\tUpdate an existing tool
            .tool rollback <name> <version>\tRollback a toolto a specific version
            .tool history <name>\t\tShow version history of a tool
        `;
        this.emit('text', (boxen(toolHelp, { padding: 1 })));
        return toolHelp;
    }

    interrupt() {
        this.emit('interrupt');
    }

    // Call the language model agent
    async callAgent(input: string, model = 'claude', resultVar?: string): Promise<{ success: boolean; data?: any; error?: Error; }> {
        return super.callAgent(input, model, resultVar);
    }

    // Execute a JavaScript script with retry and error handling using vm2
    async callScript(script: string, retryLimit: number = 3): Promise<any> {
        return super.callScript(script, retryLimit);
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
    // Interactive mode
    console.log(chalk.bold.yellow(`AI Assistant CLI Version ${packageJson.version}`));
    console.log(chalk.yellow("Type '.help' for instructions."));
    sessionManager.readlineInterface.prompt();
} else {
    const assistant = new Assistant(sessionManager, sessionManager.chromaClient);
    ToolRegistry.getInstance(assistant);
    const query = args.join(' ');
    assistant.callAgent(query).then((response) => {
        process.exit(0);
    }).catch((error) => {
        console.error(error);
        process.exit(1);
    })
}