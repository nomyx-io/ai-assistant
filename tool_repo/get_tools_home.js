class GetToolsHome {
  name = "get_tools_home";
  description = "Get the path to the tools home directory.";
  methodSignature = "get_tools_home(): string";

  async execute(params, api) {
    const thisFolder = __dirname;
    const toolsHome = thisFolder + '/tools';
    return toolsHome;
  }
}

module.exports = GetToolsHome;