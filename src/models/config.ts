
// config.ts
export interface AILibConfig {
  defaultTimeout: number;
  maxRetries: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  cacheOptions: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
  batchOptions: {
    enabled: boolean;
    maxSize: number;
    timeout: number;
  };
  rateLimitOptions: {
    enabled: boolean;
    maxTokens: number;
    refillRate: number;
    refillInterval: number;
  };
  plugins: {
    [key: string]: boolean;
  };
}

export const defaultConfig: AILibConfig = {
  defaultTimeout: 30000,
  maxRetries: 3,
  logLevel: 'info',
  cacheOptions: {
    enabled: true,
    maxSize: 1000,
    ttl: 300000, // 5 minutes
  },
  batchOptions: {
    enabled: true,
    maxSize: 10,
    timeout: 100,
  },
  rateLimitOptions: {
    enabled: true,
    maxTokens: 60,
    refillRate: 1,
    refillInterval: 1000,
  },
  plugins: {
    ResponseCaching: true,
    RequestBatching: true,
    ModelVersioning: true,
    AdaptiveRateLimiting: true,
    StreamAggregation: true,
    MultiModelInference: true,
    AutomaticRetry: true,
    PerformanceMonitoring: true,
  },
};

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AILibConfig;

  constructor() {
    this.config = defaultConfig;
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  updateConfig(newConfig: Partial<AILibConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): AILibConfig {
    return this.config;
  }
}