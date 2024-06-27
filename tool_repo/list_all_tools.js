class list_all_toolsTool {

  async execute(params, api) {
    const toolsHome = await api.callTool('get_tools_home', {});
    const tools = await fs.promises.readdir(toolsHome);
    return tools;
  }

}

module.exports = new list_all_toolsTool();