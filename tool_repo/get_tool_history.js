// This is javascript code for a tool module
class get_tool_historyTool {

  async execute(params, api) {
    return api.getToolHistory(params.name);
  }

}

module.exports = new get_tool_historyTool();