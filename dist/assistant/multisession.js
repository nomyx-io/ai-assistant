"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assistant_1 = __importDefault(require("./assistant"));
const prompt_1 = __importDefault(require("./prompt"));
const unique_username_generator_1 = require("unique-username-generator");
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY)
    process.stdin.setRawMode(true);
const emojis = {
    'process-user-input': {
        'action': 'Add',
        'emoji': '🖊️' // Pen for adding new inputs
    },
    'start-run': {
        'action': 'Start',
        'emoji': '🚀' // Rocket for initiating or starting something
    },
    'update-run': {
        'action': 'Update/Refresh/Sync',
        'emoji': '🔄' // The existing refresh emoji is quite apt, but it stays for consistency
    },
    'cancel-run': {
        'action': 'Stop/Pause',
        'emoji': '🛑' // Stop sign for a clearer stop/pause action
    },
    'complete-run': {
        'action': 'Complete/Finish',
        'emoji': '🎉' // Party popper for celebrating completion
    },
    'incomplete-run': {
        'action': 'Incomplete/Unfinish',
        'emoji': '⚠️' // Warning sign to indicate something is incomplete or unfinished
    },
    'handle-run-action-required': {
        'action': 'Accept/Approve/Confirm',
        'emoji': '✔️' // Check mark for acceptance or approval
    },
    "show-message": {
        "action": "Read/View",
        "emoji": "👀" // Eyes for viewing or reading messages
    },
    "session-complete": {
        "action": "Complete/Finish",
        "emoji": "🏁" // Checkered flag for marking completion
    },
    submit_tool_outputs: {
        "action: ": "Submit",
        "emoji": "📤" // Outbox tray for submitting tool outputs
    },
    "assistant-input": {
        "action": "Add",
        "emoji": "✍️" // Writing hand for adding input
    },
    'runs-create': {
        'action': 'Create',
        'emoji': '🌟' // Sparkles for creation, indicating something new and shiny
    },
    'runs-queued': {
        'action': 'List/Display',
        'emoji': '🔍' // Magnifying glass for looking at a list or display
    },
    'cancel-active-run': {
        'action': 'Stop/Pause',
        'emoji': '✋' // Raised hand as a stop gesture
    },
    'run-expired': {
        'action': 'Stop/Pause',
        'emoji': '🕰️' // An old clock to indicate expiration or timeout
    },
    'run-requires-action': {
        'action': 'Accept/Approve/Confirm',
        'emoji': '📬' // Mailbox with flag up to indicate action is needed, like receiving mail
    },
    "idle": {
        "action": "Start",
        "emoji": "💤" // Zzz for idle, indicating readiness to wake up and start
    },
};
class TerminalSessionManager {
    constructor() {
        this.model = 'gpt-4-turbo-preview';
        this.name = 'assistant';
        this.sm_state = {
            requirements: 'no requirements set',
            percent_complete: 0,
            status: 'idle',
            tasks: [],
            current_task: '',
            notes: 'no AI notes.',
            chat: 'no chat messages'
        };
        this.sessions = [];
        this.activeSessionIndex = 0;
        this.name = (0, unique_username_generator_1.generateUsername)("", 2, 38);
        this.initializeReadline();
    }
    // Initialize the readline interface
    initializeReadline() {
        this.readlineInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        });
        let isCtrlAPressed = false;
        process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'a') {
                isCtrlAPressed = true;
            }
            else if (isCtrlAPressed) {
                if (key.name === 'n') {
                    this.createNewSession(this);
                    isCtrlAPressed = false;
                }
                else if (key.name === 'c') {
                    this.switchToNextSession();
                    isCtrlAPressed = false;
                }
            }
            else {
                isCtrlAPressed = false;
            }
        });
        this.readlineInterface.on('line', (line) => {
            if (!line) {
                this.readlineInterface.prompt();
                return;
            }
            this.executeCommandInActiveSession(line);
        }).on('close', () => {
            console.log('Session closed');
            process.exit(0);
        });
        this.createNewSession(this);
    }
    createNewSession(parent) {
        return __awaiter(this, void 0, void 0, function* () {
            this.sessionManager = parent;
            const newSession = new TerminalSession(this);
            this.sessions.push(newSession);
            this.activeSessionIndex = this.sessions.length - 1;
            this.switchToSession(this.activeSessionIndex);
            console.clear();
            newSession.setState(this.sessions[newSession.id]);
            this.readlineInterface.prompt();
        });
    }
    switchToNextSession() {
        if (this.sessions.length === 0) {
            console.log('No sessions to switch to.');
            return;
        }
        this.activeSessionIndex = (this.activeSessionIndex + 1) % this.sessions.length;
        this.switchToSession(this.activeSessionIndex);
        console.clear();
        console.log('Switched to next session.');
    }
    switchToSession(index) {
        console.log(`Switched to session ${index}.`);
        this.sessions[this.activeSessionIndex].printHistory();
    }
    executeCommandInActiveSession(command) {
        this.sessions[this.activeSessionIndex].executeCommand(command);
    }
}
class TerminalSession extends assistant_1.default {
    constructor(manager) {
        super();
        this.manager = manager;
        this.id = '';
        this.history = [];
        this.prompt = prompt_1.default;
        this.actionHandlers['session-complete'] = this.onSessionComplete;
        this.actionHandlers['before-event'] = this.onBeforeEvent;
    }
    onSessionComplete({ message }) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(message);
            this.manager.readlineInterface.prompt();
        });
    }
    onBeforeEvent(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const out = emojis[data.action] ? emojis[data.action].emoji : '';
            if (out && `${data.type}-${data.api}` !== 'runs retrieve') {
                process.stdout.write('\n');
            }
            if (out)
                process.stdout.write(out);
        });
    }
    executeCommand(command) {
        this.history.push(command);
        this.emit('send-message', {
            message: command,
        });
        console.log(`${emojis['assistant-input'].emoji} ${command}`);
    }
    printHistory() {
        console.log(`Session History [${this.history.length} commands]:`);
        this.history.forEach((command, index) => {
            console.log(`${index + 1}: ${command}`);
        });
    }
    clearHistory() { this.history = []; }
}
new TerminalSessionManager();
// TODO: Implement dynamic loading of tools and schemas from the ./tools folder
// This will involve scanning the ./tools directory, loading each tool,
// and integrating them into the actionHandlers and schemas.
// TODO: Ensure that each TerminalSession instance correctly utilizes the shared config.json for state management.
// This may require implementing a mechanism to read and write to the config.json
// in a way that supports concurrent access by multiple TerminalSession instances.
// TODO: Add comprehensive error handling and validation for TerminalSession configurations.
// This should include validation of tool and schema loading, as well as
// error handling for issues with config.json access and manipulation.
// TODO: Develop unit tests for TerminalSession and TerminalSessionManager functionalities.
// These tests should cover the dynamic loading of tools and schemas, state management,
// and error handling scenarios.
