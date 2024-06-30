import { AILibPlugin, Model, Request } from './types';

export class PerformanceMonitoringPlugin implements AILibPlugin {
  name = 'PerformanceMonitoring';
  private metrics: Map<string, { totalTime: number; callCount: number }> = new Map();

  async preExecution(model: Model, request: Request): Promise<void> {
    request.startTime = Date.now();
  }

  async postExecution(model: Model, request: Request, response: string): Promise<void> {
    const executionTime = Date.now() - request.startTime;
    const current = this.metrics.get(model.id) || { totalTime: 0, callCount: 0 };
    current.totalTime += executionTime;
    current.callCount += 1;
    this.metrics.set(model.id, current);
  }

  getAverageExecutionTime(modelId: string): number {
    const metric = this.metrics.get(modelId);
    if (!metric) return 0;
    return metric.totalTime / metric.callCount;
  }

  getAllMetrics(): Map<string, { averageTime: number; callCount: number }> {
    const result = new Map();
    for (const [modelId, metric] of this.metrics.entries()) {
      result.set(modelId, {
        averageTime: metric.totalTime / metric.callCount,
        callCount: metric.callCount
      });
    }
    return result;
  }
}