export class ScriptPerformanceMonitor {
    private static metrics: Map<string, {
      executionCount: number,
      totalExecutionTime: number,
      averageExecutionTime: number,
      lastExecutionTime: Date
    }> = new Map();
  
    static recordExecution(scriptName: string, executionTime: number): void {
      const metric = this.metrics.get(scriptName) || {
        executionCount: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        lastExecutionTime: new Date()
      };
  
      metric.executionCount++;
      metric.totalExecutionTime += executionTime;
      metric.averageExecutionTime = metric.totalExecutionTime / metric.executionCount;
      metric.lastExecutionTime = new Date();
  
      this.metrics.set(scriptName, metric);
    }
  
    static getMetrics(scriptName: string): any {
      return this.metrics.get(scriptName);
    }
  
    static getAllMetrics(): Map<string, any> {
      return this.metrics;
    }
  }