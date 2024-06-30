import { AILibPlugin, Model, Request } from '../types';

class AdaptiveRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private backoffFactor: number = 1;

  constructor(
    private maxTokens: number,
    private refillRate: number,
    private refillInterval: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async waitForAvailability(): Promise<void> {
    while (!this.canMakeRequest()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.tokens -= 1;
  }

  adjustRate(success: boolean): void {
    if (success) {
      this.backoffFactor = Math.max(1, this.backoffFactor * 0.9);
    } else {
      this.backoffFactor *= 1.1;
    }
  }

  private canMakeRequest(): boolean {
    this.refill();
    return this.tokens >= 1;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const refillAmount = (timePassed / this.refillInterval) * this.refillRate / this.backoffFactor;
    this.tokens = Math.min(this.maxTokens, this.tokens + refillAmount);
    this.lastRefill = now;
  }
}

export class AdaptiveRateLimitingPlugin implements AILibPlugin {
  name = 'AdaptiveRateLimiting';
  private rateLimiters: Map<string, AdaptiveRateLimiter> = new Map();

  async preExecution(model: Model, request: Request): Promise<void> {
    let rateLimiter = this.rateLimiters.get(model.id);
    if (!rateLimiter) {
      rateLimiter = new AdaptiveRateLimiter(60, 1, 1000); // 60 requests per minute
      this.rateLimiters.set(model.id, rateLimiter);
    }
    await rateLimiter.waitForAvailability();
  }

  async postExecution(model: Model, request: Request, response: string): Promise<void> {
    const rateLimiter = this.rateLimiters.get(model.id);
    if (rateLimiter) {
      rateLimiter.adjustRate(true);
    }
  }
}