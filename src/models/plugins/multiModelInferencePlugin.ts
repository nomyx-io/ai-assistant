import { AILibPlugin, Model, Request, ResponseChunk } from '../types';
import { AILib } from '../aiLib';

export class MultiModelInferencePlugin implements AILibPlugin {
  name = 'MultiModelInference';

  constructor(private aiLib: AILib) {}

  async transformRequest(model: Model, request: Request): Promise<Request> {
    if (request.params.multiModel) {
      const modelIds = request.params.multiModel.modelIds as string[];
      const results = await Promise.all(modelIds.map(modelId => 
        this.aiLib.executeRequest(modelId, request.params)
      ));
      return {
        ...request,
        multiModelResults: results
      };
    }
    return request;
  }
  postExecution(model: Model, request: Request, response: string): Promise<void> {
    // Implement or leave empty if not needed
    return Promise.resolve();
  }
}