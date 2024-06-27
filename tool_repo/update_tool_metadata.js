import { Tool } from './tool-base';
import { MetadataManager } from './metadataManager';

class UpdateToolMetadataTool extends Tool {
  constructor() {
    super('update_tool_metadata', 'Update metadata for a specific tool');
  }

  async execute(params, api) {
    await MetadataManager.addMetadata(api, params.name, params.metadata);
    return true;
  }
}

export default new UpdateToolMetadataTool();