import { PluginManager } from '../pluginManager';
import { AILibPlugin } from '../types';
import { AILib } from '../ailib';

const createMockModel = (id: string) => ({
  id,
  name: `Mock Model ${id}`,
  version: '1.0',
  source: { name: 'mock', type: 'mock', connect: jest.fn(), disconnect: jest.fn() },
  categories: [],
  tags: [],
  rateLimiter: { setModelRateLimit: jest.fn(), preExecution: jest.fn() },
  executeRequest: jest.fn().mockResolvedValue('Mocked response'),
});

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let ailib: AILib;

  beforeEach(() => {
    ailib = new AILib();
    pluginManager = new PluginManager(ailib);
  });
  
    // ... other tests
  
    test('should apply plugins in order', async () => {
      const executionOrder: string[] = [];
      const mockModel = createMockModel('test-model');
      const mockRequest = {
        id: 'test-request',
        modelId: 'test-model',
        params: {},
        timestamp: new Date(),
        status: 'pending',
        isStreaming: false,
      };
  
    const plugin1: AILibPlugin = {
      name: 'Plugin1',
      preExecution: jest.fn().mockImplementation(() => {
        executionOrder.push('Plugin1 pre');
      }),
      postExecution: jest.fn().mockImplementation(() => {
        executionOrder.push('Plugin1 post');
      }),
    };

    const plugin2: AILibPlugin = {
      name: 'Plugin2',
      preExecution: jest.fn().mockImplementation(() => {
        executionOrder.push('Plugin2 pre');
      }),
      postExecution: jest.fn().mockImplementation(() => {
        executionOrder.push('Plugin2 post');
      }),
    };

    pluginManager.registerPlugin(plugin1);
    pluginManager.registerPlugin(plugin2);

    await pluginManager.applyPlugins(mockModel, mockRequest);

    expect(executionOrder).toEqual([
      'Plugin1 pre',
      'Plugin2 pre',
      'Plugin2 post',
      'Plugin1 post',
    ]);
  });
});