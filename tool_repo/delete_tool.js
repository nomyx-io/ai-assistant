import { Tool } from './tool-base';

class DeleteToolTool extends Tool {
  constructor() {
    super('delete_tool', 'Deletes a specified tool');
  }

  async execute(params, api) {
    return api.removeTool(params.name);
  }
}

export default new DeleteToolTool();