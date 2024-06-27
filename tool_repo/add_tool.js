import { Tool } from './tool-base';

class AddToolTool extends Tool {
  constructor() {
    super('add_tool', 'Adds a new tool to the system');
  }

  async execute(params, api) {
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

export default new AddToolTool();