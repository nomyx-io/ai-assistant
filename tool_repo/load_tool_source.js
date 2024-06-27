// This is javascript code for a tool module
class load_tool_sourceTool {

  async execute({ path }, api) {
    try {
      const fs = require('fs').promises;
      const tool = await fs.readFile(path, 'utf8');
      return tool;
    } catch (error) {
      throw new Error(`Failed to load tool source: ${error.message} Tool source: ${error.stack}`);
    }
  }

}

module.exports = new load_tool_sourceTool();