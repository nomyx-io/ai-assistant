// streamAggregationPlugin.ts
import { AILibPlugin, Model, Request, ResponseChunk } from '../types';

export class StreamAggregationPlugin implements AILibPlugin {
  name = 'StreamAggregation';

  async transformResponse(model: Model, request: Request, chunk: ResponseChunk): Promise<ResponseChunk> {
    if (!request.aggregatedResponse) {
      request.aggregatedResponse = '';
    }
    request.aggregatedResponse += chunk.content;
    return {
      ...chunk,
      aggregatedContent: request.aggregatedResponse
    };
  }
  postExecution(model: Model, request: Request, response: string): Promise<void> {
    // Implement or leave empty if not needed
    return Promise.resolve();
  }
}