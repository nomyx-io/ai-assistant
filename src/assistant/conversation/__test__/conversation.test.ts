import Conversation from '../conversation';
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { VertexAI } from '@google-cloud/vertexai';

jest.mock('@anthropic-ai/vertex-sdk');
jest.mock('@google-cloud/vertexai');


describe('Conversation', () => {
    let conversation: Conversation;

    beforeEach(() => {
        conversation = new Conversation('claude');
    });

    it('should create a Conversation instance', () => {
        expect(conversation).toBeInstanceOf(Conversation);
    });

    it('should throw an error for invalid model', () => {
        expect(() => new Conversation('invalid-model')).toThrow('Invalid model specified');
    });


    it('should chat with Claude', async () => {
        const mockCreate = jest.fn().mockResolvedValue({ content: [{ text: 'Claude response' }] });
        (AnthropicVertex as jest.Mock).mockImplementation(() => ({
            messages: {
                create: mockCreate
            }
        }));

        conversation = new Conversation('claude');
        const result = await conversation.chat([{ role: 'system', content: 'Hello' },{ role: 'user', content: 'Hello' }]);

        expect(result.content[0].text).toEqual('Claude response');
        expect(mockCreate).toHaveBeenCalled();
    });

    it('should chat with Gemini', async () => {
        const mockGenerateContent = jest.fn().mockResolvedValue({ response: { text: 'Gemini response' } });
        const mockModel = { generateContent: mockGenerateContent };
        const mockGetGenerativeModel = jest.fn().mockReturnValue(mockModel);
        
        (VertexAI as jest.Mock).mockImplementation(() => ({
            getGenerativeModel: mockGetGenerativeModel
        }));

        conversation = new Conversation('gemini');
        const result = await conversation.chat([{ role: 'user', content: 'Hello' }]);

        expect(result).toEqual({ text: 'Gemini response' });
        expect(mockGenerateContent).toHaveBeenCalled();
        expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-1.5-pro-001' });
    });
});
