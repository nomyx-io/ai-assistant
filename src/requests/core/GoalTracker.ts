import { Goal, ExecutionContext, Plugin } from "../types";
import { TransformableState } from "./TransformableState";

export class GoalTracker {
    goals: Goal[] = [];
  
    addGoal(goal: Goal) {
      this.goals.push(goal);
    }
  
    isComplete(state: TransformableState): boolean {
      return this.goals.every(goal => goal.checkCompletion(state));
    }
  }
  
  // core/PluginManager.ts
  export class PluginManager {
    private plugins: Plugin[] = [];
  
    registerPlugin(plugin: Plugin) {
      this.plugins.push(plugin);
    }
  
    async runHook(hookName: string, context: ExecutionContext) {
      for (const plugin of this.plugins) {
        if (plugin.hooks[hookName]) {
          await plugin.hooks[hookName](context);
        }
      }
    }
  }
  