// historyService.ts

export class HistoryService {
    private history: string[] = [];
    private maxHistorySize: number;
  
    constructor(maxHistorySize: number = 1000) {
      this.maxHistorySize = maxHistorySize;
    }
  
    saveToHistory(command: string): void {
      this.history.unshift(command);
      if (this.history.length > this.maxHistorySize) {
        this.history.pop();
      }
    }
  
    getHistory(): string[] {
      return [...this.history];
    }
  
    clearHistory(): void {
      this.history = [];
    }
  
    searchHistory(query: string): string[] {
      return this.history.filter(cmd => cmd.includes(query));
    }
  }