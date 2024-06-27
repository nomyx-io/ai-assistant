import { Tool } from './tool-base';

class predict_likely_toolsTool extends Tool {
  constructor() {
    super('predict_likely_tools', 'Predicts likely tools based on a user request');
  }

  async execute(params, api) {
    return api.predictLikelyTools(params.userRequest);
  }
}

export default new predict_likely_toolsTool();