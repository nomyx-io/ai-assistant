// This is javascript code for a tool module
class update_toolTool {

  async execute(params, api) {
    const { ScriptValidator } = require('./validator');
    const isValid = await ScriptValidator.validate(params.source);
    if (!isValid) {
      throw new Error('Tool validation failed');
    }
    return api.updateTool(params.name, params.source, params.schema, params.tags);
  }

}

module.exports = new update_toolTool();