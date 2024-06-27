// This is javascript code for a tool module
class save_toolTool {

  async execute({ tool, path }, api) {
    try {
      const fs = require('fs').promises;
      const name = Object.keys(tool)[0];
      await fs.writeFile(path, `module.exports = ${JSON.stringify(tool, null, 2)};`);
      return name;
    } catch (error) {
      throw new Error(`Failed to save tool: ${error.message} Tool source: ${error.stack}`);
    }
  }

}

module.exports = new save_toolTool();