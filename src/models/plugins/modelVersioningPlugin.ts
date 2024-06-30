import { AILib } from '../ailib';
import { AILibPlugin, Model, Request } from '../types';

export class ModelVersioningPlugin implements AILibPlugin {
  name = 'ModelVersioning';

  constructor(private aiLib: AILib) {}
  preExecution?: ((model: Model, request: Request) => Promise<void>) | undefined;
  async postExecution(model: Model, request: Request, response: string): Promise<void> {
    // Perform any post-execution logic here
    console.log(`Model ${model.id} executed successfully.`);
    console.log(`Request: ${JSON.stringify(request)}`);
    console.log(`Response: ${response}`);
  }

  async transformRequest(model: Model, request: Request): Promise<Request> {
    if (request.params.version) {
      const versionedModel = this.aiLib.getModelRegistry().getModelById(model.id);
      if (versionedModel) {
        return { ...request, modelId: versionedModel.id };
      }
    }
    return request;
  }
}