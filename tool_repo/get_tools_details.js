// This is javascript code for a tool module
class get_tools_detailsTool {

  async execute(params, api) {
    const { tools } = params;
    const toolsDetails = await Promise.all(tools.map(async (tool) => {
      return await api.callTool('get_tool_details', { tool });
    }));
    return toolsDetails;
  }

}

module.exports = new get_tools_detailsTool();