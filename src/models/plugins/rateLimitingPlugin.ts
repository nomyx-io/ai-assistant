// rateLimitingPlugin.ts
import { AILibPlugin, Model, Request } from '../types';

class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number,
    private refillInterval: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async getToken(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) * (this.refillInterval / this.refillRate);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const refillAmount = (timePassed / this.refillInterval) * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + refillAmount);
    this.lastRefill = now;
  }
}

export class RateLimitingPlugin implements AILibPlugin {
  name = 'RateLimiting';
  private rateLimiters: Map<string, TokenBucket> = new Map();

  constructor(private defaultConfig: {
    maxTokens: number;
    refillRate: number;
    refillInterval: number;
  }) {}

  setModelRateLimit(modelId: string, config: {
    maxTokens: number;
    refillRate: number;
    refillInterval: number;
  }): void {
    this.rateLimiters.set(modelId, new TokenBucket(
      config.maxTokens,
      config.refillRate,
      config.refillInterval
    ));
  }

  async preExecution(model: Model, request: Request): Promise<void> {
    let rateLimiter = this.rateLimiters.get(model.id);
    if (!rateLimiter) {
      rateLimiter = new TokenBucket(
        this.defaultConfig.maxTokens,
        this.defaultConfig.refillRate,
        this.defaultConfig.refillInterval
      );
      this.rateLimiters.set(model.id, rateLimiter);
    }
    await rateLimiter.getToken();
  }
  postExecution(model: Model, request: Request, response: string): Promise<void> {
    // Implement or leave empty if not needed
    return Promise.resolve();
  }
}