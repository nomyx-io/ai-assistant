import { AILibPlugin, Model, Request, ResponseChunk } from '../types';

export class RequestBatchingPlugin implements AILibPlugin {
  name = 'RequestBatching';
  private batchSize: number;
  private batchTimeout: number;
  private currentBatch: Request[] = [];
  private batchPromise: Promise<void> | null = null;

  constructor(batchSize: number = 10, batchTimeout: number = 100) {
    this.batchSize = batchSize;
    this.batchTimeout = batchTimeout;
  }

  async transformRequest(model: Model, request: Request): Promise<Request> {
    this.currentBatch.push(request);

    if (!this.batchPromise) {
      this.batchPromise = new Promise(resolve => {
        setTimeout(async () => {
          const batchToProcess = this.currentBatch;
          this.currentBatch = [];
          this.batchPromise = null;
          await this.processBatch(model, batchToProcess);
          resolve();
        }, this.batchTimeout);
      });
    }

    if (this.currentBatch.length >= this.batchSize) {
      await this.batchPromise;
    }

    return request;
  }

  private async processBatch(model: Model, batch: Request[]): Promise<void> {
    // Implement batched request to the model
    // This will depend on the specific model's API
    // For this example, we'll just call the model for each request
    await Promise.all(batch.map(request => model.executeRequest(request.params)));
  }

  postExecution(model: Model, request: Request, response: string): Promise<void> {
    // Implement or leave empty if not needed
    return Promise.resolve();
  }
}