// This is javascript code for a tool module
class rollback_toolTool {

  async execute(params, api) {
    return api.rollbackTool(params.name, params.version);
  }

}

module.exports = new rollback_toolTool();