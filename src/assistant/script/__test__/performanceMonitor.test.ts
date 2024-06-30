import { ScriptPerformanceMonitor } from '../performanceMonitor';

describe('ScriptPerformanceMonitor', () => {
  beforeEach(() => {
    // Clear the metrics before each test
    (ScriptPerformanceMonitor as any).metrics.clear();
  });

  it('should record script execution', () => {
    ScriptPerformanceMonitor.recordExecution('testScript', 100);
    const metrics = ScriptPerformanceMonitor.getMetrics('testScript');
    expect(metrics).toEqual({
      executionCount: 1,
      totalExecutionTime: 100,
      averageExecutionTime: 100,
      lastExecutionTime: expect.any(Date)
    });
  });

  it('should update metrics on multiple executions', () => {
    ScriptPerformanceMonitor.recordExecution('testScript', 100);
    ScriptPerformanceMonitor.recordExecution('testScript', 200);
    const metrics = ScriptPerformanceMonitor.getMetrics('testScript');
    expect(metrics).toEqual({
      executionCount: 2,
      totalExecutionTime: 300,
      averageExecutionTime: 150,
      lastExecutionTime: expect.any(Date)
    });
  });

  it('should return null for non-existent script metrics', () => {
    const metrics = ScriptPerformanceMonitor.getMetrics('nonExistentScript');
    expect(metrics).toBeUndefined();
  });

  it('should return all metrics', () => {
    ScriptPerformanceMonitor.recordExecution('script1', 100);
    ScriptPerformanceMonitor.recordExecution('script2', 200);
    const allMetrics = ScriptPerformanceMonitor.getAllMetrics();
    expect(allMetrics.size).toBe(2);
    expect(allMetrics.has('script1')).toBe(true);
    expect(allMetrics.has('script2')).toBe(true);
  });


  it('should record execution and calculate average time', () => {
    ScriptPerformanceMonitor.recordExecution('testScript', 100);
    ScriptPerformanceMonitor.recordExecution('testScript', 200);

    const metrics = ScriptPerformanceMonitor.getMetrics('testScript');
    expect(metrics).toEqual({
      executionCount: 2,
      totalExecutionTime: 300,
      averageExecutionTime: 150,
      lastExecutionTime: expect.any(Date)
    });
  });

  it('should return undefined for non-existent script metrics', () => {
    const metrics = ScriptPerformanceMonitor.getMetrics('nonExistentScript');
    expect(metrics).toBeUndefined();
  });

  it('should return all metrics', () => {
    ScriptPerformanceMonitor.recordExecution('script1', 100);
    ScriptPerformanceMonitor.recordExecution('script2', 200);

    const allMetrics = ScriptPerformanceMonitor.getAllMetrics();
    expect(allMetrics.size).toBe(2);
    expect(allMetrics.get('script1')).toBeDefined();
    expect(allMetrics.get('script2')).toBeDefined();
  });
});

