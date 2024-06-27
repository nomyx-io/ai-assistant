class LoadTool {
  name = 'load_tool';
  description = 'Load a tool from a file path.';
  schema = {
    type: 'function',
    function: {
      name: 'load_tool',
      description: 'Load a tool from a file path.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path of the tool to load'
          }
        },
        required: ['path']
      },
      returns: {
        type: 'string',
        description: 'The name of the loaded tool'
      }
    }
  };

  execute({ path }, api) {
    return new Promise((resolve, reject) => {
      try {
        const toolModule = require(path);
        const toolName = toolModule.name;
        api.toolRegistry.addTool(toolName, toolModule.source, toolModule.schema, toolModule.tags || []);
        resolve(toolName);
      } catch (error) {
        reject(new Error(`Failed to load tool: ${error.message} Tool source: ${error.stack}`));
      }
    });
  }
}

module.exports = new LoadTool();