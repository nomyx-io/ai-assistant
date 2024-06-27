import { Tool } from './tool-base';

class get_all_performance_metricsTool extends Tool {
  constructor() {
    super('get_all_performance_metrics', 'Get all performance metrics');
  }

  async execute(params, api) {
    return performanceMonitor_1.ScriptPerformanceMonitor.getAllMetrics();
  }
}

export default new get_all_performance_metricsTool();