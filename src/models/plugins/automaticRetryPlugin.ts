import { AILibPlugin, Model, Request } from './types';

export class AutomaticRetryPlugin implements AILibPlugin {
  name = 'AutomaticRetry';

  constructor(private maxRetries: number = 3, private baseDelay: number = 1000) {}

  async preExecution(model: Model, request: Request): Promise<void> {
    request.retryCount = 0;
  }

  async postExecution(model: Model, request: Request, response: string): Promise<void> {
    if (request.error && request.retryCount < this.maxRetries) {
      request.retryCount++;
      const delay = this.baseDelay * Math.pow(2, request.retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      throw new Error('Retry');
    }
  }
}