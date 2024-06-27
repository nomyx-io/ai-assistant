import { Tool } from './tool-base';
import { ScriptValidator } from './validator';

class UpdateToolTool extends Tool {
  constructor() {
    super('update_tool', {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool to update"
        },
        source: {
          type: "string",
          description: "New source code of the tool"
        },
        description: {
          type: "string",
          description: "New description of the tool"
        },
        tags: {
          type: "array",
          items: {
            type: "string"
          },
          description: "New tags for the tool"
        },
        schema: {
          type: "object",
          description: "New schema for the tool"
        }
      },
      required: [
        "name",
        "source"
      ]
    });
  }

  async execute(params, api) {
    const isValid = await ScriptValidator.validate(params.source);
    if (!isValid) {
      throw new Error('Tool validation failed');
    }
    return api.updateTool(params.name, params.source, params.schema, params.tags);
  }
}

export default new UpdateToolTool();