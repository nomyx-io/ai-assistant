import fs from 'fs';

export class ErrorLogger {
  private logFilePath: string;

  constructor(logFilePath: string) {
    this.logFilePath = logFilePath;
  }

  public logError(errorDetails: any): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      ...errorDetails
    };

    const logEntry = JSON.stringify(errorLog) + '\n';
    fs.appendFileSync(this.logFilePath, logEntry);
  }

  public getErrors(): any[] {
    const logContent = fs.readFileSync(this.logFilePath, 'utf-8');
    return logContent.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => JSON.parse(line));
  }

  public analyzeErrors(): any {
    const errors = this.getErrors();
    // Implement error analysis logic here
    // For example, count occurrences of each error type
    const errorCounts: { [key: string]: number } = {};
    errors.forEach(error => {
      const errorType = error.error || 'Unknown';
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    });
    return errorCounts;
  }
}

export const debugLog = (message: string, data?: any) => {
  console.log(message, data);
};
