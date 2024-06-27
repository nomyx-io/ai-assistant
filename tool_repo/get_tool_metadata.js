import { Tool } from './tool-base';

class get_tool_metadataTool extends Tool {
  constructor() {
    super('get_tool_metadata', {
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
    return await api.MetadataManager.getMetadata(params.name);
  }
}

export default new get_tool_metadataTool();