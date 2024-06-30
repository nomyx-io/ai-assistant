// responseCachingPlugin.ts
import LRU from 'lru-cache';
import { AILibPlugin, Model, Request, ResponseChunk } from '../types';

export class ResponseCachingPlugin implements AILibPlugin {
  name = 'ResponseCaching';
  private cache: LRU<string, string>;

  constructor(maxSize: number = 1000, ttl: number = 1000 * 60 * 5) {
    this.cache = new LRU({ max: maxSize, ttl });
  }
  preExecution?: ((model: Model, request: Request) => Promise<void>) | undefined;
  postExecution(model: Model, request: Request, response: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async transformRequest(model: Model, request: Request): Promise<Request> {
    const cacheKey = `${model.id}:${JSON.stringify(request.params)}`;
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse) {
      return { ...request, cachedResponse };
    }
    return request;
  }

  async transformResponse(model: Model, request: Request, chunk: ResponseChunk): Promise<ResponseChunk> {
    if (chunk.isComplete) {
      const cacheKey = `${model.id}:${JSON.stringify(request.params)}`;
      this.cache.set(cacheKey, chunk.content);
    }
    return chunk;
  }
}