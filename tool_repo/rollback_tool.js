import { Tool } from './tool-base';

class rollback_toolTool extends Tool {
  constructor() {
    super('rollback_tool', 'Rollback a tool to a specific version');
  }

  async execute(params, api) {
    return api.rollbackTool(params.name, params.version);
  }
}

export default new rollback_toolTool();