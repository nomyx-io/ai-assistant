// middleware.ts
import { Request, ResponseChunk } from './types';

export type Middleware = (
  request: Request,
  next: () => Promise<AsyncGenerator<ResponseChunk>>
) => Promise<AsyncGenerator<ResponseChunk>>;

export class MiddlewareManager {
  private middleware: Middleware[] = [];

  use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  async applyMiddleware(
    request: Request,
    handler: () => Promise<AsyncGenerator<ResponseChunk>>
  ): Promise<AsyncGenerator<ResponseChunk>> {
    let index = 0;
    const next = async (): Promise<AsyncGenerator<ResponseChunk>> => {
      if (index < this.middleware.length) {
        return this.middleware[index++](request, next);
      } else {
        return handler();
      }
    };
    return next();
  }
}