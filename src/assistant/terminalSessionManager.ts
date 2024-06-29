// terminalSessionManager.ts

import { EventEmitter } from 'events';
import { ChromaClient } from 'chromadb';
import { TerminalSession } from './terminalSession';
import { UI } from './ui';
import ToolRegistry from './toolRegistry';
import { createSystemTools } from './systemTools';
import os from 'os';

// also the tool registry 
export class TerminalSessionManager extends ToolRegistry {
  private sessions: TerminalSession[] = [];
  private activeSessionIndex: number = 0;
  public ui: UI;
  private toolRegistry: ToolRegistry;
  private systemTools: any;

  constructor(public chromaClient: ChromaClient) {
    super();
    this.ui = new UI();
    this.toolRegistry = new ToolRegistry();
    this.systemTools = createSystemTools(this.ui, this.toolRegistry, this);
    this.initializeSessionManagement();
  }

  private initializeSessionManagement() {
    this.createNewSession();
    this.setupInputHandler();
    this.startStatusBarUpdates();
  }

  private setupInputHandler() {
    this.ui.readlineInterface.on('line', (input: string) => {
      this.executeCommandInActiveSession(input);
    });
  }

  private startStatusBarUpdates() {
    setInterval(() => {
      const activeSession = this.sessions[this.activeSessionIndex];
      const sessionInfo = `${activeSession.id} (${this.activeSessionIndex + 1}/${this.sessions.length})`;
      const activeTools = this.toolRegistry.getActiveTools();
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      const performance = os.loadavg()[0];
      const statusInfo = `Session: ${sessionInfo} | Active Tools: ${activeTools.join(', ')} | Memory: ${memoryUsage.toFixed(2)}MB | Performance: ${performance.toFixed(2)}ms`;
      this.ui.updateStatusBar(statusInfo);
    }, 10000);
  }

  createNewSession(clearScreen: boolean = true) {
    const newSession = new TerminalSession(this, this.chromaClient, this.ui, this.toolRegistry, this.systemTools);
    this.sessions.push(newSession);
    this.activeSessionIndex = this.sessions.length - 1;
    this.switchToSession(this.activeSessionIndex, false, clearScreen);
  }

  switchToSession(index: number, showPrompt: boolean = true, clearScreen: boolean = true) {
    this.activeSessionIndex = index;
    const session = this.sessions[this.activeSessionIndex];
    if (session) {
      clearScreen && this.ui.clearScreen();
      this.ui.print(`Switched to session ${session.id}`);
      session.restoreState();
      if (showPrompt) {
        this.ui.readlineInterface.prompt();
      }
    }
  }

  async executeCommandInActiveSession(command: string) {
    if (this.sessions.length === 0) {
      this.createNewSession();
    }
    const activeSession = this.sessions[this.activeSessionIndex];
    try {
      const result = await activeSession.execute(command);
      if (result.success) {
        this.ui.updateOutput(result.data, 'aiResponse');
      } else {
        this.ui.updateOutput(`Error: ${result.error?.message}`, 'error');
      }
    } catch (error) {
      console.error('Error executing command:', error);
      this.ui.updateOutput(`Unexpected error: ${(error as Error).message}`, 'error');
    }
  }

  exitSession() {
    if (this.sessions.length > 1) {
      this.sessions.splice(this.activeSessionIndex, 1);
      this.activeSessionIndex = this.activeSessionIndex % this.sessions.length;
      this.switchToSession(this.activeSessionIndex);
    } else {
      this.ui.print("Exiting the application...");
      process.exit(0);
    }
  }
}