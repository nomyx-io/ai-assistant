import { Task, ExecutionContext } from "../types";

export class PromptGenerator {
    async generatePrompt(task: Task, context: ExecutionContext): Promise<string> {
      const promptTemplate = await this.getPromptTemplate(task.type);
      return this.fillPromptTemplate(promptTemplate, context);
    }
  
    private async getPromptTemplate(taskType: string): Promise<string> {
      // This would typically fetch from a database or file system
      return `Perform the following ${taskType} task: {{task_description}}`;
    }
  
    private fillPromptTemplate(template: string, context: ExecutionContext): string {
      return template.replace(/{{(\w+)}}/g, (_, key) => context.state.resources[key] || '');
    }
  }