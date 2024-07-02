import { MiddlewareFunction, ExecutionContext } from "../types";

export class MiddlewareChain {
    private middlewares: MiddlewareFunction[] = [];
  
    use(middleware: MiddlewareFunction) {
      this.middlewares.push(middleware);
    }
  
    async execute(context: ExecutionContext) {
      const runner = async (index: number): Promise<void> => {
        if (index < this.middlewares.length) {
          await this.middlewares[index](context, () => runner(index + 1));
        }
      };
      await runner(0);
    }
  }