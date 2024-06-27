// This is javascript code for a tool module
class get_tool_metadataTool {

  async execute(params, api) {
    return metadataManager_1.MetadataManager.getMetadata(api, params.name);
  }

}

module.exports = new get_tool_metadataTool();