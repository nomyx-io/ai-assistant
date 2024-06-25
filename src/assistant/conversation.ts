
// conversation.ts
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { VertexAI } from '@google-cloud/vertexai';

export default class Conversation {
  model: string;
  projectId: string;
  location: string;
  client: any;
  vertexAI: any;
  constructor(model: any) {
    this.model = model.toLowerCase();

    if (this.model !== 'claude' && this.model !== 'gemini') {
      throw new Error("Invalid model specified. Choose either 'claude' or 'gemini'.");
    }

    // Vertex AI Configuration (adjust if needed)
    this.projectId = 'silent-blade-417120';
    this.location = this.model === 'claude' ? 'us-east5' : 'us-central1';

    if (this.model === 'claude') {
      this.client = new AnthropicVertex({
        region: this.location,
        projectId: this.projectId,
      });
    } else {
      this.vertexAI = new VertexAI({
        project: this.projectId,
        location: this.location
      });
    }
  }

  async chat(messages: any[], options = {}, model = 'gemini-1.5-pro-001') {
    const { max_tokens = 4000, temperature = 0.15 }: any = options;

    if (this.model === 'claude') {
      return this.chatWithClaude(messages, max_tokens, temperature);
    } else {
      return this.chatWithGemini(messages, max_tokens, temperature, model);
    }
  }

  async chatWithClaude(messages: any[], max_tokens: number, temperature: number) {
    try {
      let system = "You are a helpful assistant.";
      if (messages[0].role === "system") {
        system = messages[0].content;
        messages.shift();
      }
      const result = await this.client.messages.create({
        messages: messages,
        model: 'claude-3-5-sonnet@20240620', //'claude-3-opus@20240229',
        system,
        max_tokens: max_tokens,
        temperature: temperature,
      });
      return result;
    } catch (error) {
      console.error(error);
      return error;
    }
  }

  async chatWithGemini(messages: any[], max_tokens: number, temperature: number, model: string = 'gemini-1.5-pro-001') {
    const generativeModel = this.vertexAI.getGenerativeModel({
      model: model,
    });
    const prompt = messages.map(message => `${message.role}: ${message.content}`).join('\n');

    const resp = await generativeModel.generateContent(prompt, {
      temperature: temperature,
      maxOutputTokens: max_tokens,
    });

    const contentResponse = await resp.response;
    return contentResponse;
  }
}