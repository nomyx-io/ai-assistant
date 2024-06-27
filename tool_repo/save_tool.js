class SaveTool {
  constructor(api) {
    this.api = api;
  }

  async save_tool({ tool, path }) {
    try {
      const name = Object.keys(tool)[0];
      await this.api.fs.writeFile(path, `module.exports = ${JSON.stringify(tool, null, 2)};`);
      return name;
    } catch (error) {
      throw new Error(`Failed to save tool: ${error.message} Tool source: ${error.stack}`);
    }
  }
}

module.exports = SaveTool;