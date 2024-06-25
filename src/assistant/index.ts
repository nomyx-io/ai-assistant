
import { CoreWorkflow } from "./workflow";
import { generateUsername } from "unique-username-generator";
import * as packageJson from "../../package.json";
import fs from 'fs';
import ToolRegistry, { IToolRegistry } from "./tool_registry";
import { ChromaClient } from "chromadb";
import Assistant from "./assistant";

export class AssistantSessionManager extends ToolRegistry implements IToolRegistry {

    sessions: any[];
    activeSessionIndex: number;
    commandMode: boolean = false;

    constructor(public chromaClient: ChromaClient) {
        super();
        console.clear();
        this.sessions = [];
        this.activeSessionIndex = 0;
    }

    createNewSession() {
        const newSession = new AssistantSession(this, this.chromaClient);
        ToolRegistry.getInstance(newSession);
        this.sessions.push(newSession);
        this.activeSessionIndex = this.sessions.length - 1;
        this.switchToSession(this.activeSessionIndex, false);
        this.emit('newSessionCreated', this.sessions[this.activeSessionIndex]);
       
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
            this.emit('sessionSwitched', this.sessions[this.activeSessionIndex]);
        }
    }

    executeCommandInActiveSession(command: string) {
        if (this.sessions.length === 0) {
            this.createNewSession();
        }
        this.emit('beforeExecuteCommand', { command });
        this.sessions[this.activeSessionIndex].execute(command);
        this.emit('afterExecuteCommand', { command });
    }

    saveSessionState() {
        this.sessions[this.activeSessionIndex].savedOutput = this.sessions[this.activeSessionIndex]._buffer ? this.sessions[this.activeSessionIndex]._buffer.toString() : '';
        this.emit('saveSessionState', this.sessions[this.activeSessionIndex].savedOutput);
    }
}


export class AssistantSession extends CoreWorkflow {

    id: string;
    debug: boolean = false;
    savedOutput: string = '';
    _buffer: any;

    sessionManager: AssistantSessionManager;
    actionHandlers: any = {};

    constructor(sessionManager: AssistantSessionManager, chromaClient: any) {
        super(sessionManager, chromaClient);
        this.id = generateUsername("", 2, 38);
        this.sessionManager = sessionManager;
        this.sessionManager.sessions.push(this);
        this.setupHandlers();
        this.setupWorkflowListeners();
    }

    emit<T extends string | symbol>(event: T, ...args: any[]): boolean {
        super.emit(event, ...args);
        this._buffer = this._buffer || [];
        this._buffer.push({ event, data: args });
        return true;
    }

    async execute(command: string) {
        if (command.startsWith('.')) {
          this.emit('beforeExecuteSpecialCommand', { command })
          await this.executeSpecialCommand(command);
          this.emit('afterExecuteSpecialCommand', { command });
        } else {
          this.emit('beforeExecuteCommand', { command })
          const result = await super.execute(command);
          this.emit('afterExecuteCommand', { command });
          return result.success ? { success: true, data: result.data } : { success: false, error: result.error };
        }
        return { success: true, data: '' };
      }

    private setupWorkflowListeners() {
        this.on('taskComplete', (data) => this.emit('taskComplete', data));
        this.on('toolUpdated', (data) => this.emit('toolUpdated', data));
    }

    async processInput(input: string): Promise<any> {
        const result = await this.execute(input);
        if (result.success) {
            return result.data;
        } else {
            throw result.error;
        }
    }

    setupHandlers() {
        super.setupHandlers();
        this.on('interrupt', (error: any) => {
            this.onInterrupt();
        });
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
                this.emit('text', `Unknown command: ${command}`);
        }
    }

    onInterrupt() {
        if (!this.working) {
            this.emit('goodbye');
            console.log('Goodbye!');
            process.exit(0);
        }
        this.removeAllListeners();
        this.sessionManager.sessions = this.sessionManager.sessions.filter((session) => session.id !== this.id);
        this.sessionManager.activeSessionIndex = 0;
        this.sessionManager.switchToSession(0);
        this.emit('text', 'Session interrupted.');
    }

    restoreSessionState() {
        this.emit('restoreSessionState', this.savedOutput);
        this.printHistory();
    }

    showHelp() {
        const helpMessage = `Commands:
.help\t\tShow this help message
.debug\t\tToggle debug mode on/off
.history\tShow command history for this session
.state\t\tShow current state of the session
.exit\t\tExit this session
Ctrl+A\t\tCreate a new session
Ctrl+C\t\tSwitch to the next session`;
        this.emit('text', helpMessage);
        return helpMessage;
    }

    toggleDebug() {
        this.debug = !this.debug;
        this.emit('text', `Debug mode is now ${this.debug ? 'on' : 'off'}`);
    }

    printHistory() {
        if (this.history.length === 0) {
            this.emit('text', 'This session has no history yet.');
            return;
        }
        const sessionHistory: any = [`Session History:`]
        this.history.forEach((command, index) => {
            sessionHistory.push(`${index + 1}. ${command}`);
        });
        this.emit('text', sessionHistory.join('\n'));
    }

    showState() {
        const state = {
            id: this.id,
            debug: this.debug,
            history: this.history
        };
        this.emit('text', JSON.stringify(state, null, 2));
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
        const toolNames = tools.map((tool: any) => `${tool.name} (v${tool.version})`);
        return [...toolNames];
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
                this.emit('text', `Tool '${name}' added successfully.`);
            } else {
                this.emit('warning',`Tool '${name}' already exists.`);
            }
        } catch (error) {
            this.emit('error', error.message);
        }
    }

    async createToolSchema(source: string) {
        const toolRegistry = ToolRegistry.getInstance(this);
        const schema = toolRegistry.createToolSchema(source);
    }

    async updateTool(name: string, sourceFile: string): Promise<boolean> {
        try {
            const source: any = await fs.readFileSync(sourceFile, 'utf8');
            const updated: any = await this.updateTool(name, source);
            if (updated) {
                this.emit('toolUpdated', { name, version: updated.version });
            } else {
                this.emit('warning', `Tool '${name}' not found.`);
            }
            return updated;
        } catch (error) {
            this.emit('error', error.message);
        }
        return false;
    }

    async rollbackTool(name: string, version: string): Promise<boolean> {
        try {
            const rolledBack: any = await this.rollbackTool(name, version);
            if (rolledBack) {
                this.emit('toolRolledBack', { name, version });
            } else {
                this.emit('warning', `Failed to rollback tool '${name}' to version ${version}.`);
            }
        } catch (error) {
            this.emit('error', error.message);
        }
        return false;
    }

    showToolHelp() {
        const ret = `Tool management commands:
.tool list\t\t\tList all available tools
.tool add <name> <file> [tags]\tAdd a new tool
.tool update <name> <file>\tUpdate an existing tool
.tool rollback <name> <version>\tRollback a toolto a specific version
.tool history <name>\t\tShow version history of a tool`;
        this.emit('text', ret);
        return ret;
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
const sessionManager = new AssistantSessionManager(client);

const assistant = new Assistant(sessionManager, sessionManager.chromaClient);
ToolRegistry.getInstance(assistant);

sessionManager.createNewSession();

sessionManager.on('newSessionCreated', (session) => {
    session.emit('text', `Assistant v${packageJson.version} ready. Type '.help' for available commands.`);
});

export default sessionManager;
export { assistant }