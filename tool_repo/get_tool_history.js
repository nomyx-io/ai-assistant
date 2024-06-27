import { Tool } from './tool-base';

class get_tool_historyTool extends Tool {
  constructor() {
    super('get_tool_history', {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool"
        }
      },
      required: [
        "name"
      ]
    });
  }

  async execute(params, api) {
    return api.getToolHistory(params.name);
  }
}

export default new get_tool_historyTool();