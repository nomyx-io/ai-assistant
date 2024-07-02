import { ExecutionContext } from "../types";

export abstract class Handler {
    protected next: Handler | null = null;
  
    setNext(handler: Handler): Handler {
      this.next = handler;
      return handler;
    }
  
    abstract handle(context: ExecutionContext): Promise<void>;
  }