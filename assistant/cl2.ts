require('dotenv').config();

const { generateUsername } = require( "unique-username-generator" );
const readline = require('readline');
import AssistantAPI from './assistant';

const { configManager } = require('./config-manager');
const loadConfig = () => configManager.getConfig();

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

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
}

class TerminalSession extends AssistantAPI {
    id: string = '';
    history: string[];
    constructor(public manager: any) {
        super();
        this.history = [];
        this.prompt =require('./prompt').default;
        this.actionHandlers['session-complete'] = this.onSessionComplete;
    }
    async onSessionComplete({ message }: any) {
        console.log(message);
    }
    executeCommand(command: string) {
        this.history.push( command);
        this.emit('send-message', {
            message: command,
        });   
    }
    printHistory() {
        console.log(`Session History [${this.history.length} commands]:`);
        this.history.forEach((command, index) => {
            console.log(`${index + 1}: ${command}`);
        });
    }
    clearHistory() { this.history = []; }
}

class TerminalSessionManager {

    sessions: TerminalSession[];
    activeSessionIndex: number;
    readlineInterface:any;
    assistant: any;

    model = 'gpt-4-turbo-preview';
    name = 'assistant';
    
    sm_state: any = {
        requirements: 'no requirements set',
        percent_complete: 0,
        status: 'idle',
        tasks: [],
        current_task: '',
        notes: 'no AI notes.',
        chat: 'no chat messages'
    };

    sessionManager: any
    
    constructor() {
        this.sessions = [];
        this.activeSessionIndex = 0;
        this.name = generateUsername("", 2, 38);
        this.initializeReadline()
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
            } else if (isCtrlAPressed) {
                if (key.name === 'n') {
                    this.createNewSession(this);
                    isCtrlAPressed = false; 
                } else if (key.name === 'c') {
                    this.switchToNextSession();
                    isCtrlAPressed = false; 
                }
            } else {
                isCtrlAPressed = false; 
            }
        });

        this.readlineInterface.on('line', (line: string) => {
            this.executeCommandInActiveSession(line);
        }).on('close', () => {
            console.log('Session closed');
            process.exit(0);
        });

        this.createNewSession(this); 
    }

   async createNewSession(parent: TerminalSessionManager) {
        this.sessionManager = parent;
        const newSession = new TerminalSession(this);
        this.sessions.push(newSession);
        this.activeSessionIndex = this.sessions.length - 1;
        this.switchToSession(this.activeSessionIndex);
        console.clear();
        newSession.setState(this.sessions[newSession.id as any]);
    }

    switchToNextSession() {
        // if there are no sessions, show a message and return
        if (this.sessions.length === 0) {
            console.log('No sessions to switch to.');
            return;
        }
        this.activeSessionIndex = (this.activeSessionIndex + 1) % this.sessions.length;
        this.switchToSession(this.activeSessionIndex);
        console.clear();
        console.log('Switched to next session.');
    }

    switchToSession(index: number) {
        console.log(`Switched to session ${index}.`);
        this.sessions[this.activeSessionIndex].printHistory();
    }

    executeCommandInActiveSession(command: string) {
        this.sessions[this.activeSessionIndex].executeCommand(command);
    }
}

new TerminalSessionManager();