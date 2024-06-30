// terminalSessionManager.ts
import { TerminalSession } from './terminalSession';
import { AgentService } from '../agentService';

export class TerminalSessionManager {
  private sessions: Map<string, TerminalSession> = new Map();

  constructor(private agentService: AgentService) {}

  createSession(id: string): TerminalSession {
    const session = new TerminalSession(id, this.agentService);
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): TerminalSession | undefined {
    return this.sessions.get(id);
  }

  removeSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  async executeCommandInSession(sessionId: string, command: string): Promise<any> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return await session.execute(command);
  }
}