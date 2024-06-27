class get_all_performance_metricsTool {

  async execute(params, api) {
    return performanceMonitor_1.ScriptPerformanceMonitor.getAllMetrics();
  }

}

module.exports = new get_all_performance_metricsTool();