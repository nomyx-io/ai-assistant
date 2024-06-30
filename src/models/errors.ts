// errors.ts
export class AILibError extends Error {
    constructor(message: string) {
      super(message);
      this.name = this.constructor.name;
    }
  }
  
  export class ModelNotFoundError extends AILibError {}
  export class RequestTimeoutError extends AILibError {}
  export class RateLimitError extends AILibError {}