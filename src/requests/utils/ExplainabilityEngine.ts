import { ExecutionContext } from "../types";

export class ExplainabilityEngine {
    private logs: string[] = [];
  
    logDecision(decision: string, context: any) {
      this.logs.push(`Decision: ${decision}, Context: ${JSON.stringify(context)}`);
    }
  
    async generateExplanation(context: ExecutionContext): Promise<string> {
      const explanationPrompt = `
        Given the following session history and state, provide a concise explanation 
        of the decision-making process and key steps taken:
        ${JSON.stringify(context.session)}
        
        Logs:
        ${this.logs.join('\n')}
      `;
      return await context.session.activeModels[0].generate(explanationPrompt);
    }
  }