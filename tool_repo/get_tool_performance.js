// This is javascript code for a tool module
class get_tool_performanceTool {

  async execute(params, api) {
    return performanceMonitor_1.ScriptPerformanceMonitor.getMetrics(params.name);
  }

}

module.exports = new get_tool_performanceTool();