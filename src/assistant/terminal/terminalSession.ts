// terminalSession.ts
import { AgentService } from '../agentService';
import { HistoryService } from '../history/historyService';

export class TerminalSession {
  private historyService: HistoryService;

  constructor(
    public readonly id: string,
    private agentService: AgentService
  ) {
    this.historyService = new HistoryService();
  }

  async execute(command: string): Promise<any> {
    this.historyService.saveToHistory(command);
    return await this.agentService.processCommand(command);
  }

  getHistory(): string[] {
    return this.historyService.getHistory();
  }

  clearHistory(): void {
    this.historyService.clearHistory();
  }

  searchHistory(query: string): string[] {
    return this.historyService.searchHistory(query);
  }

}