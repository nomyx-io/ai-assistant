import { Tool } from './tool-base';

class list_toolsTool extends Tool {
  constructor() {
    super('list_tools', 'List available tools, optionally filtered by tags');
  }

  async execute(params, api) {
    const allTools = await api.getToolList();
    if (params.tags && params.tags.length > 0) {
      return allTools.filter(tool => params.tags.every(tag => tool.tags.includes(tag)));
    }
    return allTools;
  }
}

export default new list_toolsTool();