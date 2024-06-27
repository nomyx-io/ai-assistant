class GetToolsDetails {
  name = 'get_tools_details';
  description = 'Get the details of the specified tools.';
  methodSignature = "get_tools_details(tools: string[]): { name: 'string', description: 'string', input_schema: 'object', output_schema: 'object' }[]";

  async execute(params, api) {
    const { tools } = params;
    const toolsDetails = await Promise.all(tools.map(async (tool) => {
      return await api.callTool('get_tool_details', { tool });
    }));
    return toolsDetails;
  }
}

module.exports = new GetToolsDetails();