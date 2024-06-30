// scriptManager.ts
import { ScriptValidator } from './validator';
import { ScriptPerformanceMonitor } from './performanceMonitor';
import { ScriptCleanupManager } from './cleanupManager';
import { MetadataManager, ScriptMetadata } from './metadataManager';
import { ToolRegistry } from '../tools/toolRegistry';

export class ScriptManager {

  constructor(private toolRegistry: ToolRegistry) {
  }

  async initialize(): Promise<void> {
    await ScriptCleanupManager.cleanupUnusedScripts(this.toolRegistry);
  }

  async validateScript(script: string): Promise<boolean> {
    return await ScriptValidator.validate(script);
  }

  recordExecution(scriptName: string, executionTime: number): void {
    ScriptPerformanceMonitor.recordExecution(scriptName, executionTime);
  }

  async cleanupUnusedScripts(): Promise<void> {
    await ScriptCleanupManager.cleanupUnusedScripts(this.toolRegistry);
  }

  async addMetadata(scriptName: string, metadata: Partial<ScriptMetadata>): Promise<void> {
    await MetadataManager.addMetadata(this.toolRegistry, scriptName, metadata);
  }

  async getMetadata(scriptName: string): Promise<ScriptMetadata | null> {
    return await MetadataManager.getMetadata(this.toolRegistry, scriptName);
  }

  async updateMetadata(scriptName: string, metadata: Partial<ScriptMetadata>): Promise<void> {
    await MetadataManager.updateMetadata(this.toolRegistry, scriptName, metadata);
  }

  async removeMetadata(scriptName: string): Promise<void> {
    await MetadataManager.removeMetadata(this.toolRegistry, scriptName);
  }

  getMetrics(scriptName: string): any {
    return ScriptPerformanceMonitor.getMetrics(scriptName);
  }

  getAllMetrics(): Map<string, any> {
    return ScriptPerformanceMonitor.getAllMetrics();
  }
}