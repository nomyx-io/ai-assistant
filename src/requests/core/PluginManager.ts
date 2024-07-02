import { ExecutionContext } from "../types";

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
  