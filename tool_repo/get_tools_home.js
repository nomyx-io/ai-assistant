// This is javascript code for a tool module
class get_tools_homeTool {

  async execute(params, api) {
    const thisFolder = __dirname;
    const toolsHome = thisFolder + '/tools';
    return toolsHome;
  }

}

module.exports = new get_tools_homeTool();