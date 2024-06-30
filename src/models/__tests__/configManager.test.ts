import { ConfigManager, defaultConfig, AILibConfig } from '../config';

describe('ConfigManager', () => {
  test('should initialize with default configuration', () => {
    const configManager = new ConfigManager();
    expect(configManager.getConfig()).toEqual(defaultConfig);
  });

  test('should update configuration', () => {
    const configManager = new ConfigManager();
    const newConfig = {
      defaultTimeout: 60000,
      maxRetries: 5,
    };
    configManager.updateConfig(newConfig);
    expect(configManager.getConfig().defaultTimeout).toBe(60000);
    expect(configManager.getConfig().maxRetries).toBe(5);
  });

  test('should merge partial configurations', () => {
    const configManager = new ConfigManager();
    const partialConfig: Partial<AILibConfig> = {
      cacheOptions: {
        enabled: true,
        maxSize: 2000,
        ttl: 300000,
      },
    };
    configManager.updateConfig(partialConfig);
    expect(configManager.getConfig().cacheOptions.maxSize).toBe(2000);
    expect(configManager.getConfig().cacheOptions.ttl).toBe(defaultConfig.cacheOptions.ttl);
  });
});