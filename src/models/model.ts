import { Model, ModelSource, ModelParams, ResponseChunk } from './types';
import { RateLimiter } from './rate-limiter';
import { ConfigManager } from './config';
import { RequestTimeoutError, RateLimitError } from './errors';

export abstract class BaseModel implements Model {
  constructor(
    public id: string,
    public name: string,
    public version: string,
    public source: ModelSource,
    public categories: string[],
    public tags: string[],
    public rateLimiter: RateLimiter
  ) {}

  abstract generateResponse(params: ModelParams): AsyncGenerator<string>;

  async *executeRequest(params: ModelParams): AsyncGenerator<ResponseChunk> {
    const config = ConfigManager.getInstance().getConfig();
    
    try {
      await this.rateLimiter.waitForAvailability();
    } catch (error) {
      throw new RateLimitError('Rate limit exceeded');
    }

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new RequestTimeoutError('Request timed out')), config.defaultTimeout);
    });

    const responseGenerator = this.generateResponse(params);

    while (true) {
      try {
        const { value, done } = await Promise.race([
          responseGenerator.next(),
          timeout
        ]);

        if (done) {
          yield { requestId: params.requestId, content: '', isComplete: true };
          break;
        }

        yield { requestId: params.requestId, content: value, isComplete: false };
      } catch (error) {
        if (error instanceof RequestTimeoutError) {
          throw error;
        }
        // Handle other errors
        console.error('Error in model execution:', error);
        yield { requestId: params.requestId, content: '', isComplete: true };
        break;
      }
    }
  }
}