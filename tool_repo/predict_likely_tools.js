// This is javascript code for a tool module
class predict_likely_toolsTool {

  async execute(params, api) {
    return api.predictLikelyTools(params.userRequest);
  }

}

module.exports = new predict_likely_toolsTool();