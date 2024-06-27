import { Tool } from './tool-base';

class get_tool_performanceTool extends Tool {
  constructor() {
    super('get_tool_performance', 'Get performance metrics for a specific tool');
  }

  async execute(params, api) {
    return performanceMonitor_1.ScriptPerformanceMonitor.getMetrics(params.name);
  }
}

export default new get_tool_performanceTool();