import { Tool } from '../tool';
import ToolRegistry from '../toolRegistry';

import { ScriptPerformanceMonitor } from './performanceMonitor';

export class ScriptCleanupManager {
  private static readonly CLEANUP_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

  static async cleanupUnusedScripts(toolRegistry: ToolRegistry): Promise<void> {
    const allScripts = await toolRegistry.getToolList();
    const currentDate = new Date();

    for (const script of allScripts) {
      const metrics = ScriptPerformanceMonitor.getMetrics(script.name);
      if (metrics) {
        const daysSinceLastExecution = (currentDate.getTime() - metrics.lastExecutionTime.getTime()) / (24 * 60 * 60 * 1000);
        if (daysSinceLastExecution > 30 && metrics.executionCount < 5) {
          await this.archiveScript(toolRegistry, script);
        }
      }
    }
  }

  private static async archiveScript(toolRegistry: ToolRegistry, script: Tool): Promise<void> {
    await toolRegistry.updateTool(script.name, script.source, { ...script.schema, archived: true }, script.tags);
  }
}