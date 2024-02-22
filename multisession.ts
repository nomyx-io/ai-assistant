const readline = require('readline');

class TerminalSessionManager {
    sessions: TerminalSession[];
    activeSessionIndex: number;
    readlineInterface:any;

    constructor() {
        this.sessions = [];
        this.activeSessionIndex = 0;
        this.initializeReadline();
    }

    initializeReadline() {
        this.readlineInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'Terminal> '
        });

        this.readlineInterface.on('line', (line: string) => {
            if (line === 'CTRL+A+N') {
                this.createNewSession();
            } else if (line === 'CTRL+A+C') {
                this.switchToNextSession();
            } else {
                this.executeCommandInActiveSession(line);
            }
            this.readlineInterface.prompt();
        }).on('close', () => {
            console.log('Session closed');
            process.exit(0);
        });

        this.createNewSession(); // Start with one session open
        this.readlineInterface.prompt();
    }

    createNewSession() {
        const newSession = new TerminalSession();
        this.sessions.push(newSession);
        this.activeSessionIndex = this.sessions.length - 1;
        this.switchToSession(this.activeSessionIndex);
        console.log('New session created.');
    }

    switchToNextSession() {
        this.activeSessionIndex = (this.activeSessionIndex + 1) % this.sessions.length;
        this.switchToSession(this.activeSessionIndex);
        console.log('Switched to next session.');
    }

    switchToSession(index: any) {
        console.log(`Switched to session ${index}.`);
        this.sessions[this.activeSessionIndex].printHistory();
    }

    executeCommandInActiveSession(command: any) {
        this.sessions[this.activeSessionIndex].executeCommand(command);
    }
}

class TerminalSession {
    history: any[];

    constructor() {
        this.history = [];
    }

    executeCommand(command: any) {
        this.history.push(command);
        console.log(`Executed: ${command}`);
    }

    printHistory() {
        console.log(`Session History [${this.history.length} commands]:`);
        this.history.forEach((command: any, index: number) => {
            console.log(`${index + 1}: ${command}`);
        });
    }
}

const manager = new TerminalSessionManager(); 
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

class TerminalSessionManager {
    sessions: TerminalSession[];
    activeSessionIndex: number;
    readlineInterface:any;

    constructor() {
        this.sessions = [];
        this.activeSessionIndex = 0;
        this.initializeReadline();
    }

    initializeReadline() {
        this.readlineInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'Terminal> '
        });

        let isCtrlAPressed = false;

        process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'a') {
                isCtrlAPressed = true;
            } else if (isCtrlAPressed) {
                if (key.name === 'n') {
                    this.createNewSession();
                    isCtrlAPressed = false; // Reset flag after handling
                } else if (key.name === 'c') {
                    this.switchToNextSession();
                    isCtrlAPressed = false; // Reset flag after handling
                }
            } else {
                isCtrlAPressed = false; // Reset flag if other keys are pressed
            }
        });

        this.readlineInterface.on('line', (line: string) => {
            this.executeCommandInActiveSession(line);
            this.readlineInterface.prompt();
        }).on('close', () => {
            console.log('Session closed');
            process.exit(0);
        });

        this.createNewSession(); // Start with one session open
        this.readlineInterface.prompt();
    }

    createNewSession() {
        const newSession = new TerminalSession();
        this.sessions.push(newSession);
        this.activeSessionIndex = this.sessions.length - 1;
        this.switchToSession(this.activeSessionIndex);
        console.log('New session created.');
    }

    switchToNextSession() {
        this.activeSessionIndex = (this.activeSessionIndex + 1) % this.sessions.length;
        this.switchToSession(this.activeSessionIndex);
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

class TerminalSession {
    history: string[];

    constructor() {
        this.history = [];
    }

    executeCommand(command: string) {
        this.history.push(command);
        console.log(`Executed: ${command}`);
    }

    printHistory() {
        console.log(`Session History [${this.history.length} commands]:`);
        this.history.forEach((command, index) => {
            console.log(`${index + 1}: ${command}`);
        });
    }
}

const manager = new TerminalSessionManager(); 
