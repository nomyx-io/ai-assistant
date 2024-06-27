// This is javascript code for a tool module
class update_tool_metadataTool {

  async execute(params, api) {
    await metadataManager_1.MetadataManager.addMetadata(api, params.name, params.metadata);
    return true;
  }

}

module.exports = new update_tool_metadataTool();