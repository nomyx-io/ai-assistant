import { Task, ExecutionContext } from "../types";

export class ErrorHandler {
    async handleError(error: Error, task: Task, context: ExecutionContext): Promise<'retry' | 'skip' | 'abort'> {
      const errorPrompt = `
        An error occurred while processing the following task:
        ${JSON.stringify(task)}
        
        Error details: ${error.message}
        
        Current session state:
        ${JSON.stringify(context.state)}
        
        Should we retry the task, skip it, or abort the entire process? 
        Please respond with 'retry', 'skip', or 'abort' and provide a brief explanation.
      `;
      
      const response = await context.session.activeModels[0].generate(errorPrompt);
      return response.toLowerCase().split(' ')[0] as 'retry' | 'skip' | 'abort';
    }
  }