// This is javascript code for a tool module
class load_toolTool {

  async execute({ path }, api) {
    try {
      const toolModule = require(path);
      const toolName = toolModule.name;
      api.toolRegistry.addTool(toolName, toolModule.source, toolModule.schema, toolModule.tags || []);
      return toolName;
    } catch (error) {
      throw new Error(`Failed to load tool: ${error.message} Tool source: ${error.stack}`);
    }
  }

}

module.exports = new load_toolTool();