
// types.ts

export interface AILibPlugin {
  name: string;
  preExecution?: (model: Model, request: Request) => Promise<void>;
  postExecution(model: Model, request: Request, response: string): Promise<void>;
}

export interface RateLimiter {
  setModelRateLimit(modelId: string, config: {
    maxTokens: number;
    refillRate: number;
    refillInterval: number;
  }): void;
  preExecution(model: Model, request: Request): Promise<void>;
}
export interface Middleware {
  (request: Request, next: () => Promise<AsyncGenerator<ResponseChunk>>): Promise<AsyncGenerator<ResponseChunk>>;
}

export interface ModelSource {
  name: string;
  type: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface Model {
  id: string;
  name: string;
  version: string;
  source: ModelSource;
  categories: string[];
  tags: string[];
  rateLimiter: RateLimiter;
  executeRequest(params: ModelParams): AsyncGenerator<ResponseChunk>;
}

export interface ModelRegistry {
  registerModel(model: Model): void;
  unregisterModel(modelId: string): void;
  getModelById(modelId: string): Model | undefined;
  getFallbackModel(modelId: string): Model | undefined;
  listModels(): Model[];
  searchModels(criteria: SearchCriteria): Model[];
}

export interface Request {
  id: string;
  modelId: string;
  params: ModelParams;
  timestamp: Date;
  status: RequestStatus;
  isStreaming: boolean;
}

export interface RequestQueue {
  enqueue(request: Request): string;
  batchEnqueue(requests: Request[]): string[];
  dequeue(): Request | undefined;
  getStatus(requestId: string): RequestStatus;
  complete(requestId: string): void;
}

export interface NotificationSystem {
  subscribe(callback: NotificationCallback): void;
  unsubscribe(callback: NotificationCallback): void;
  notify(chunk: ResponseChunk): void;
}

export type ModelParams = Record<string, any>;

export interface ResponseChunk {
  requestId: string;
  content: string;
  isComplete: boolean;
}

export type RequestStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SearchCriteria {
  categories?: string[];
  tags?: string[];
  name?: string;
  version?: string;
}

export type NotificationCallback = (chunk: ResponseChunk) => void;