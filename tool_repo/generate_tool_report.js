// This is javascript code for a tool module
class generate_tool_reportTool {

  async execute(params, api) {
    return api.generateReport(params.format || 'text');
  }

}

module.exports = new generate_tool_reportTool();