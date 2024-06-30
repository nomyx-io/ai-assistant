// metricsService.ts
import fs from 'fs';
import path from 'path';

interface ToolMetrics {
  additionDate: string;
  lastUpdateDate: string;
  usageCount: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  successRate: number;
  totalExecutions: number;
  successfulExecutions: number;
}

export class MetricsService {
  private metrics: Map<string, ToolMetrics>;
  private metricsFilePath: string;

  constructor(metricsFilePath: string = path.join(__dirname, '../../metrics.json')) {
    this.metricsFilePath = metricsFilePath;
    this.metrics = new Map();
    this.loadMetrics();
  }

  private loadMetrics(): void {
    if (fs.existsSync(this.metricsFilePath)) {
      const data = fs.readFileSync(this.metricsFilePath, 'utf8');
      const jsonMetrics = JSON.parse(data);
      this.metrics = new Map(Object.entries(jsonMetrics));
    }
  }

  private saveMetrics(): void {
    const jsonMetrics = Object.fromEntries(this.metrics);
    fs.writeFileSync(this.metricsFilePath, JSON.stringify(jsonMetrics, null, 2));
  }

  recordToolAddition(toolName: string): void {
    const now = new Date().toISOString();
    this.metrics.set(toolName, {
      additionDate: now,
      lastUpdateDate: now,
      usageCount: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      successRate: 1,
      totalExecutions: 0,
      successfulExecutions: 0,
    });
    this.saveMetrics();
  }

  recordToolUpdate(toolName: string): void {
    const metrics = this.metrics.get(toolName);
    if (metrics) {
      metrics.lastUpdateDate = new Date().toISOString();
      this.saveMetrics();
    }
  }

  recordToolUsage(toolName: string, executionTime: number, success: boolean): void {
    const metrics = this.metrics.get(toolName);
    if (metrics) {
      metrics.usageCount++;
      metrics.totalExecutionTime += executionTime;
      metrics.totalExecutions++;
      if (success) {
        metrics.successfulExecutions++;
      }
      metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.totalExecutions;
      metrics.successRate = metrics.successfulExecutions / metrics.totalExecutions;
      this.saveMetrics();
    }
  }

  recordToolRemoval(toolName: string): void {
    this.metrics.delete(toolName);
    this.saveMetrics();
  }

  getToolMetrics(toolName: string): ToolMetrics | undefined {
    return this.metrics.get(toolName);
  }

  getAllMetrics(): Map<string, ToolMetrics> {
    return new Map(this.metrics);
  }

  generateReport(): string {
    let report = "Tool Metrics Report\n==================\n\n";
    for (const [toolName, metrics] of this.metrics.entries()) {
      report += `Tool: ${toolName}\n`;
      report += `  Added: ${metrics.additionDate}\n`;
      report += `  Last Updated: ${metrics.lastUpdateDate}\n`;
      report += `  Usage Count: ${metrics.usageCount}\n`;
      report += `  Average Execution Time: ${metrics.averageExecutionTime.toFixed(2)}ms\n`;
      report += `  Success Rate: ${(metrics.successRate * 100).toFixed(2)}%\n`;
      report += `  Total Executions: ${metrics.totalExecutions}\n\n`;
    }
    return report;
  }
}