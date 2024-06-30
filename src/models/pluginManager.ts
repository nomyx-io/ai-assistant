import { AILib } from './ailib';
import { Model, Request, ResponseChunk } from './types';

export interface AILibPlugin {
  name: string;
  preExecution?: (model: Model, request: Request) => Promise<void>;
  postExecution?: (model: Model, request: Request, response: string) => Promise<void>;
  transformRequest?: (model: Model, request: Request) => Promise<Request>;
  transformResponse?: (model: Model, request: Request, chunk: ResponseChunk) => Promise<ResponseChunk>;
}

export class PluginManager {
  private plugins: AILibPlugin[] = [];

  constructor(private aiLib: AILib) {}

  registerPlugin(plugin: AILibPlugin): void {
    this.plugins.push(plugin);
  }

  async applyPlugins(model: Model, request: Request): Promise<AsyncGenerator<ResponseChunk, any, unknown>> {
    for (const plugin of this.plugins) {
      if (plugin.preExecution) {
        await plugin.preExecution(model, request);
      }
      if (plugin.transformRequest) {
        request = await plugin.transformRequest(model, request);
      }
    }

    const baseGenerator = model.executeRequest(request.params);

    return (async function* () {
      for await (let chunk of baseGenerator) {
        for (const plugin of this.plugins) {
          if (plugin.transformResponse) {
            chunk = await plugin.transformResponse(model, request, chunk);
          }
        }
        yield chunk;
      }

      for (const plugin of this.plugins) {
        if (plugin.postExecution) {
          await plugin.postExecution(model, request, '');
        }
      }
    })();
  }
}