import { OpenAIModel } from '../models/openaiModel';
import { OpenAI } from 'openai';

jest.mock('openai');


describe('OpenAIModel', () => {
  let model: OpenAIModel;

  beforeEach(() => {
    model = new OpenAIModel('test-model', 'Test Model', '1.0', 'fake-api-key');
  });

  test('should initialize with correct parameters', () => {
    expect(model.id).toBe('gpt-3');
    expect(model.name).toBe('GPT-3');
    expect(model.version).toBe('1.0');
  });

  test('should execute a request', async () => {
    const mockCompletion = {
      data: {
        choices: [{ text: 'Mocked response' }],
      },
    };
    // (OpenAI.createCompletion as jest.Mock).mockResolvedValue(mockCompletion);

    // const response = await model.executeRequest({ prompt: 'Test prompt' });
    // expect(response).toBe('Mocked response');
    // expect(OpenAI.prototype.createCompletion).toHaveBeenCalledWith({
    //   model: 'gpt-3',
    //   prompt: 'Test prompt',
    //   max_tokens: 100,
    // });
  });
});