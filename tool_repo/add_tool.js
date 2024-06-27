// This is javascript code for a tool module
class add_toolTool {

  async execute(params, api) {
    const { ScriptValidator } = require('./validator');
    const { MetadataManager } = require('./metadataManager');

    const isValid = await ScriptValidator.validate(params.source);
    if (!isValid) {
      throw new Error('Tool validation failed');
    }

    const success = await api.addTool(params.name, params.source, params.schema || {}, params.tags || []);
    if (success) {
      await MetadataManager.addMetadata(api, params.name, {
        originalQuery: params.originalQuery || '',
        creationDate: new Date(),
        author: 'User',
        version: '1.0.0',
        tags: params.tags || [],
        dependencies: []
      });
    }
    return success;
  }

}

module.exports = new add_toolTool();