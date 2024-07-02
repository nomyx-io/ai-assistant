

import { AIReviewResult, PromptService } from '../prompts/promptService';
import { ToolRegistry } from '../tools/toolRegistry';
import { loggingService } from '../logging/logger';

export class ErrorHandlingService {
  constructor(
    private promptService: PromptService,
    private toolRegistry: ToolRegistry
  ) {}

  async withRetry<T>(operation: (repairedValues: any) => Promise<T>, maxRetries: number = 3, fixOperation: (error: any) => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    let repairedValues: any = {};
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation(repairedValues);
      } catch (error) {
        if (error.message === 'Task cancelled') {
          throw error;
        }
        lastError = error;
        loggingService.error(`Attempt ${attempt} failed`, error, { attempt, maxRetries });
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
        if (fixOperation) {
          repairedValues = await fixOperation(error);
        }
      }
    }
    throw lastError || new Error('Operation failed after max retries');
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async attemptToFix(error: Error, context: any): Promise<{ fixed: boolean; result?: any; updatedContext?: any }> {
    loggingService.error(`Attempting to fix error: ${error.message}`, { context } as any);

    // Step 1: Analyze the error
    const errorAnalysis = await this.analyzeError(error, context);

    // Step 2: Attempt AI-assisted repair
    const repairAttempt = await this.aiAssistedRepair(errorAnalysis, context);

    if (repairAttempt.fixed) {
      loggingService.info('AI-assisted repair successful', { repairAttempt });
      return repairAttempt;
    }

    // Step 3: Attempt known error patterns
    const patternFix = await this.attemptKnownErrorPatterns(errorAnalysis, context);

    if (patternFix.fixed) {
      loggingService.info('Fixed using known error pattern', { patternFix });
      return patternFix;
    }

    // Step 4: Attempt to modify the execution environment
    const envFix = await this.modifyExecutionEnvironment(errorAnalysis, context);

    if (envFix.fixed) {
      loggingService.info('Fixed by modifying execution environment', { envFix });
      return envFix;
    }

    // Step 5: Attempt to create or modify tools
    const toolFix = await this.createOrModifyTools(errorAnalysis, context);

    if (toolFix.fixed) {
      loggingService.info('Fixed by creating or modifying tools', { toolFix });
      return toolFix;
    }

    // If all attempts fail, log the failure and return
    loggingService.warn('All fix attempts failed', { errorAnalysis });
    return { fixed: false };
  }

  private async analyzeError(error: Error, context: any): Promise<AIReviewResult> {
    return await this.promptService.analyzeError({
      error: error.message,
      stack: error.stack,
      context: JSON.stringify(context)
    });
  }

  private async aiAssistedRepair(errorAnalysis: AIReviewResult, context: any): Promise<{ fixed: boolean; result?: any; updatedContext?: any }> {
    const repairStrategy = await this.promptService.generateRepairStrategy(errorAnalysis);
    
    try {
      const result = await this.executeRepairStrategy(JSON.stringify(repairStrategy), context);
      return { fixed: true, result, updatedContext: context };
    } catch (repairError) {
      loggingService.warn('AI-assisted repair failed', { repairError });
      return { fixed: false };
    }
  }

  private async attemptKnownErrorPatterns(errorAnalysis: AIReviewResult, context: any): Promise<{ fixed: boolean; result?: any; updatedContext?: any }> {
    const knownPatterns = await this.toolRegistry.getKnownErrorPatterns();
    
    for (const pattern of knownPatterns) {
      if (pattern.matches(errorAnalysis)) {
        try {
          const result = await pattern.fix(context);
          return { fixed: true, result, updatedContext: context };
        } catch (fixError) {
          loggingService.warn(`Known pattern fix failed: ${pattern.name}`, { fixError });
        }
      }
    }

    return { fixed: false };
  }

  private async modifyExecutionEnvironment(errorAnalysis: AIReviewResult, context: any): Promise<{ fixed: boolean; result?: any; updatedContext?: any }> {
    const envModifications = await this.promptService.suggestEnvironmentModifications(errorAnalysis);
    
    for (const modification of envModifications) {
      try {
        await this.toolRegistry.modifyExecutionEnvironment(modification);
        const result = await this.retryOperation(context);
        return { fixed: true, result, updatedContext: context };
      } catch (modError) {
        loggingService.warn(`Environment modification failed: ${modification}`, { modError });
      }
    }

    return { fixed: false };
  }

  private async createOrModifyTools(errorAnalysis: AIReviewResult, context: any): Promise<{ fixed: boolean; result?: any; updatedContext?: any }> {
    const toolSuggestions = await this.promptService.suggestToolModifications(errorAnalysis);
    
    for (const suggestion of toolSuggestions) {
      try {
        if (suggestion.type === 'create') {
          //reateTool(name: string, source: string, schema: any, tags: string[], _execute: any, metadata?: Partial<ScriptMetadata>): Promise<boolean>
          await this.toolRegistry.createTool(suggestion.name, suggestion.implementation || '', suggestion.signature, [],null, {});
        } else if (suggestion.type === 'modify') {
          await this.toolRegistry.modifyTool(suggestion.name, suggestion.modifications);
        }
        
        const result = await this.retryOperation(context);
        return { fixed: true, result, updatedContext: context };
      } catch (toolError) {
        loggingService.warn(`Tool creation/modification failed: ${suggestion.name}`, { toolError });
      }
    }

    return { fixed: false };
  }

  private async executeRepairStrategy(strategy: string, context: any): Promise<any> {
    // This would be a complex method to interpret and execute the AI-generated repair strategy
    // For simplicity, we'll just evaluate it as a function
    const repairFunction = new Function('context', 'toolRegistry', strategy);
    return repairFunction(context, this.toolRegistry);
  }

  private async retryOperation(context: any): Promise<any> {
    // This method would retry the original operation that caused the error
    // The implementation depends on how your system structures operations
    return await this.toolRegistry.executeOperation(context.originalOperation, context);
  }
}