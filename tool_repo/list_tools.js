// This is javascript code for a tool module
class list_toolsTool {

  async execute(params, api) {
    const allTools = await api.getToolList();
    if (params.tags && params.tags.length > 0) {
      return allTools.filter(tool => params.tags.every(tag => tool.tags.includes(tag)));
    }
    return allTools;
  }

}

module.exports = new list_toolsTool();