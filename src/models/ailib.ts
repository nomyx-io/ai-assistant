import { Model, ModelRegistry, RequestQueue, Request, NotificationSystem, Middleware, ModelParams, ResponseChunk, AILibPlugin } from './types';
import { AILibConfig, ConfigManager } from './config';
import { PluginManager } from './pluginManager';
import { RateLimitingPlugin } from './plugins/rateLimitingPlugin';
import { ResponseCachingPlugin } from './plugins/responseCachingPlugin';
import { RequestBatchingPlugin } from './plugins/requestBatchingPlugin';
import { ModelVersioningPlugin } from './plugins/modelVersioningPlugin';
import { AdaptiveRateLimitingPlugin } from './plugins/adaptiveRateLimitingPlugin';
import { StreamAggregationPlugin } from './plugins/streamAggregationPlugin';
import { MultiModelInferencePlugin } from './plugins/multiModelInferencePlugin';
import { AutomaticRetryPlugin } from './plugins/automaticRetryPlugin';
import { PerformanceMonitoringPlugin } from './plugins/performanceMonitoringPlugin';
import { v4 as uuidv4 } from 'uuid';


export class AILib {
  private configManager: ConfigManager;
  private modelRegistry: ModelRegistry;
  private requestQueue: RequestQueue;
  private notificationSystem: NotificationSystem;
  private pluginManager: PluginManager;

  constructor(config?: Partial<AILibConfig>) {
    // Register default plugins
    this.use(new ResponseCachingPlugin());
    this.use(new RequestBatchingPlugin());
    this.use(new ModelVersioningPlugin(this));
    this.use(new RateLimitingPlugin({
      maxTokens: 60,
      refillRate: 1,
      refillInterval: 1000
    }));
    this.use(new AdaptiveRateLimitingPlugin());
    this.use(new StreamAggregationPlugin());
    this.use(new MultiModelInferencePlugin(this));
    this.use(new AutomaticRetryPlugin());
    this.use(new PerformanceMonitoringPlugin());
  }

  configure(config: Partial<AILibConfig>): void {
    this.configManager.updateConfig(config);
  }

  registerModel(model: Model): void {
    this.modelRegistry.registerModel(model);
  }

  async executeRequest(modelId: string, params: ModelParams): Promise<string> {
    const model = this.modelRegistry.getModelById(modelId);
    if (!model) {
      throw new Error(`Model with id ${modelId} not found`);
    }

    const request: Request = {
      id: uuidv4(),
      modelId,
      params,
      timestamp: new Date(),
      status: 'pending',
      isStreaming: false,
    };

    const requestId = this.requestQueue.enqueue(request);

    const executionChain = await this.pluginManager.applyPlugins(model, request);

    let fullResponse = '';
    for await (const chunk of executionChain) {
      fullResponse += chunk.content;
      this.notificationSystem.notify(chunk);
    }

    this.requestQueue.complete(requestId);

    return fullResponse;
  }


  use(plugin: AILibPlugin): void {
    this.pluginManager.registerPlugin(plugin);
  }

  on(event: string, callback: (data: any) => void): void {
    this.notificationSystem.subscribe(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    this.notificationSystem.unsubscribe(callback);
  }

  getModelRegistry(): ModelRegistry {
    return this.modelRegistry;
  }

  getRequestQueue(): RequestQueue {
    return this.requestQueue;
  }

  getConfig(): AILibConfig {
    return this.configManager.getConfig();
  }
}