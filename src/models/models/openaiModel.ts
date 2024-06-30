import OpenAI from 'openai';
import { BaseModel } from '../model';
import { ModelParams, ModelSource, RateLimiter } from '../types';

class TokenBucketRateLimiter implements RateLimiter {
  private lastRequestTime: number;
  private maxRequests: number;
  private requestsRemaining: number;
  private requestInterval: number;

  constructor(maxRequests: number, requestInterval: number, initialRequestsRemaining: number = maxRequests) {
    this.maxRequests = maxRequests;
    this.requestsRemaining = initialRequestsRemaining;
    this.requestInterval = requestInterval;
    this.lastRequestTime = Date.now();
  }
  setModelRateLimit(modelId: string, config: { maxTokens: number; refillRate: number; refillInterval: number; }): void {
    throw new Error('Method not implemented.');
  }

  async preExecution(): Promise<void> {
    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.requestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  setRateLimit(maxRequests: number, requestInterval: number): void {
    this.maxRequests = maxRequests;
    this.requestInterval = requestInterval;

    if (this.requestsRemaining > maxRequests) {
      this.requestsRemaining = maxRequests;
    }
  }

}

export class OpenAIModel extends BaseModel {
  private openai: OpenAI;
  private apiKey: string;
  
  constructor(
    id: string,
    name: string,
    version: string,
    apiKey: string,
    categories: string[] = [],
    tags: string[] = [],
    source: string = 'openai',
    rateLimiter?: RateLimiter
  ) {
    const modelSource: ModelSource = { name: 'openai', type: 'openai', connect: jest.fn(), disconnect: jest.fn() };
    super(id, name, version, modelSource, categories, tags, new TokenBucketRateLimiter(60, 1, 1000)); // 60 requests per minute
    const configuration = { apiKey: this.apiKey };
    this.openai = new OpenAI(configuration);
  }

  async *generateResponse(params: ModelParams): AsyncGenerator<string> {
    const stream = await this.openai.completions.create({
      model: this.name,
      prompt: params.prompt,
      max_tokens: params.maxTokens || 100,
      temperature: params.temperature || 0.7,
      stream: true,
    } as any) as any;

    for await (const chunk of stream.data as any) {
      const content = chunk.choices[0].text;
      if (content) {
        yield content;
      }
    }
  }
}