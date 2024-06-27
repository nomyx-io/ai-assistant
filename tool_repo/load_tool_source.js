class LoadToolSource {
  name = "load_tool_source";
  description = "Load a tool from a file path and return the source code.";
  methodSignature = "load_tool_source(path: string): string";

  async load_tool_source({ path }, api) {
    try {
      const tool = await fs.readFile(path, 'utf8');
      return tool;
    } catch (error) {
      throw new Error(`Failed to load tool source: ${error.message} Tool source: ${error.stack}`);
    }
  }
}

module.exports = LoadToolSource;