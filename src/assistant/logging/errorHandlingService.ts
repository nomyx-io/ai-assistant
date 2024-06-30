// errorHandlingService.ts
import { loggingService } from './logger';

export class ErrorHandlingService {
  async withRetry<T>(operation: (repairedValues: any) => Promise<T>, maxRetries: number = 3, fixOperation: (error: any) => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    let repairedValues: any = {};
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation(repairedValues);
      } catch (error) {
        lastError = error;
        loggingService.error(`Attempt ${attempt} failed`, error, { attempt, maxRetries });
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
        if (fixOperation) {
          repairedValues = await fixOperation(error);
        }
      }
    }
    throw lastError || new Error('Operation failed after max retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}