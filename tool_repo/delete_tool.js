// This is javascript code for a tool module
class delete_toolTool {

  async execute(params, api) {
    return api.removeTool(params.name);
  }

}

module.exports = new delete_toolTool();