import { AILib } from '../ailib';
import { OpenAIModel } from '../models/openaiModel';

describe('AILib', () => {
  let aiLib: AILib;

  beforeEach(() => {
    aiLib = new AILib();
  });

  test('should initialize with default configuration', () => {
    expect(aiLib.getConfig()).toBeDefined();
  });

  test('should register a model', () => {
    const model = new OpenAIModel('test-model', 'Test Model', '1.0', 'fake-api-key');
    aiLib.registerModel(model);
    expect(aiLib.getModelRegistry().getModelById('test-model')).toBeDefined();
  });

  test('should execute a request', async () => {
    const mockModel = {
      id: 'mock-model',
      name: 'Mock Model',
      version: '1.0',
      source: { name: 'mock', type: 'mock', connect: jest.fn(), disconnect: jest.fn() },
      categories: [],
      tags: [],
      rateLimiter: { setModelRateLimit: jest.fn(), preExecution: jest.fn() },
      executeRequest: jest.fn().mockResolvedValue('Mocked response'),
    };
    aiLib.registerModel(mockModel);

    const response = await aiLib.executeRequest('mock-model', { prompt: 'Test prompt' });
    expect(response).toBe('Mocked response');
    expect(mockModel.executeRequest).toHaveBeenCalledWith({ prompt: 'Test prompt' });
  });

  test('should throw an error for non-existent model', async () => {
    await expect(aiLib.executeRequest('non-existent-model', { prompt: 'Test' }))
      .rejects.toThrow('Model with id non-existent-model not found');
  });
});