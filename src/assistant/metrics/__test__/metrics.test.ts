import { MetricsService } from '../metricsService';
import fs from 'fs';

jest.mock('fs');

describe('MetricsService', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    metricsService = new MetricsService();
    // Reset the mock calls count after service initialization
    (fs.writeFileSync as jest.Mock).mockClear();
  });

  it('should record tool addition', () => {
    metricsService.recordToolAddition('newTool');
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('should record tool update', () => {
    metricsService.recordToolAddition('existingTool');
    (fs.writeFileSync as jest.Mock).mockClear(); // Clear previous calls
    metricsService.recordToolUpdate('existingTool');
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('should record tool usage', () => {
    metricsService.recordToolAddition('usedTool');
    (fs.writeFileSync as jest.Mock).mockClear(); // Clear previous calls
    metricsService.recordToolUsage('usedTool', 100, true);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('should get tool metrics', () => {
    metricsService.recordToolAddition('metricTool');
    metricsService.recordToolUsage('metricTool', 100, true);
    const metrics = metricsService.getToolMetrics('metricTool');
    expect(metrics).toBeDefined();
    expect(metrics?.usageCount).toBe(1);
  });

  it('should generate a report', () => {
    metricsService.recordToolAddition('reportTool');
    metricsService.recordToolUsage('reportTool', 100, true);
    const report = metricsService.generateReport();
    expect(report).toContain('reportTool');
  });
});