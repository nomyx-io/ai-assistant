// This is javascript code for a tool module
class get_tool_detailsTool {

  async execute({ tool }, api) {
    const toolsHome = await api.callTool('get_tools_home', {});
    const toolPath = `${toolsHome}/${tool}.ts`;
    const existsSync = require('fs').existsSync;
    if (!existsSync(toolPath)) {
      throw new Error(`The tool '${tool}' does not exist.`);
    }
    const toolModule = require(toolPath);
    return toolModule.schema;
  }

}

module.exports = new get_tool_detailsTool();