import { AILib } from '../ailib';
import { InMemoryModelRegistry } from '../modelRegistry';
import { OpenAIModel } from '../models/openaiModel';
import { ModelRegistry, AILibPlugin } from '../types';

const createMockModel = (id: string) => ({
  id: 'mock-model',
  name: 'Mock Model',
  version: '1.0',
  source: { name: 'mock', type: 'mock', connect: jest.fn(), disconnect: jest.fn() },
  categories: [],
  tags: [],
  rateLimiter: { setModelRateLimit: jest.fn(), preExecution: jest.fn() },
  executeRequest: jest.fn().mockResolvedValue('Mocked response'),
});

describe('ModelRegistry', () => {
  let modelRegistry: ModelRegistry;
  let mockAILib: jest.Mocked<AILib>;

  beforeEach(() => {
    modelRegistry = new InMemoryModelRegistry();
  });

  test('should register and retrieve a model', () => {
    const model = new OpenAIModel('test-model', 'Test Model', '1.0', 'fake-api-key');
    modelRegistry.registerModel(model);
    expect(modelRegistry.getModelById('test-model')).toBe(model);
  });

  test('should unregister a model', () => {
    const model = new OpenAIModel('test-model', 'Test Model', '1.0', 'fake-api-key');
    modelRegistry.registerModel(model);
    modelRegistry.unregisterModel('test-model');
    expect(modelRegistry.getModelById('test-model')).toBeUndefined();
  });

  test('should list all registered models', () => {
    const model1 = new OpenAIModel('model1', 'Model 1', '1.0', 'fake-api-key');
    const model2 = new OpenAIModel('model2', 'Model 2', '1.0', 'fake-api-key');
    modelRegistry.registerModel(model1);
    modelRegistry.registerModel(model2);
    expect(modelRegistry.listModels()).toHaveLength(2);
    expect(modelRegistry.listModels()).toContain(model1);
    expect(modelRegistry.listModels()).toContain(model2);
  });

  test('should search models by criteria', () => {
    const model1 = new OpenAIModel('model1', 'GPT Model', '1.0', 'fake-api-key');
    const model2 = new OpenAIModel('model2', 'BERT Model', '1.0', 'fake-api-key');
    model1.categories = ['text-generation'];
    model2.categories = ['text-classification'];
    modelRegistry.registerModel(model1);
    modelRegistry.registerModel(model2);

    const results = modelRegistry.searchModels({ categories: ['text-generation'] });
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(model1);
  });

  test('should apply custom configuration', () => {
    const customConfig = {
      defaultTimeout: 60000,
      maxRetries: 5,
    };
    mockAILib.configure(customConfig);
    expect(mockAILib.getConfig().defaultTimeout).toBe(60000);
    expect(mockAILib.getConfig().maxRetries).toBe(5);
  });

  test('should execute a request', async () => {
    const mockModel = createMockModel('mock-model');
    mockAILib.registerModel(mockModel);

    const response = await mockAILib.executeRequest('mock-model', { prompt: 'Test prompt' });
    expect(response).toBe('Mocked response');
    expect(mockModel.executeRequest).toHaveBeenCalledWith({ prompt: 'Test prompt' });
  });


  // test('should execute multi-model request', async () => {
  //   const mockModel1 = {
  //     id: 'model1',
  //     executeRequest: jest.fn().mockResolvedValue('Response 1'),
  //   };
  //   const mockModel2 = {
  //     id: 'model2',
  //     executeRequest: jest.fn().mockResolvedValue('Response 2'),
  //   };
  //   mockAILib.registerModel(mockModel1);
  //   mockAILib.registerModel(mockModel2);

  //   const results = await mockAILib.executeMultiModelRequest(['model1', 'model2'], { prompt: 'Test' });
  //   expect(results.get('model1')).toBe('Response 1');
  //   expect(results.get('model2')).toBe('Response 2');
  // });

  test('should handle plugin execution', async () => {
    const mockPlugin: AILibPlugin = {
      name: 'MockPlugin',
      preExecution: jest.fn(),
      postExecution: jest.fn(),
    };
    mockAILib.use(mockPlugin);

    const mockModel = {
      id: 'mock-model',
      executeRequest: jest.fn().mockResolvedValue('Mocked response'),
      
    };
    mockAILib.registerModel(mockModel);

    await mockAILib.executeRequest('mock-model', { prompt: 'Test' });
    expect(mockPlugin.preExecution).toHaveBeenCalled();
    expect(mockPlugin.postExecution).toHaveBeenCalled();
  });

  test('should handle streaming responses', async () => {
    const mockModel = {
      id: 'stream-model',
      executeRequest: jest.fn().mockImplementation(async function* () {
        yield { content: 'Chunk 1', isComplete: false };
        yield { content: 'Chunk 2', isComplete: true };
      }),
    };
    mockAILib.registerModel(mockModel);

    const chunks: string[] = [];
    mockAILib.on('chunk', (chunk) => chunks.push(chunk.content));

    await mockAILib.executeRequest('stream-model', { prompt: 'Test', stream: true });
    expect(chunks).toEqual(['Chunk 1', 'Chunk 2']);
  });
});