
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

  async chat(messages: any[], options = {
    max_tokens : 4000, 
    temperature : 0.15,
    responseFormat: ''
  }, model = 'gemini-1.5-pro-001') {
    const {}: any = options;
    if(!Array.isArray(messages)) {
      throw new Error('Messages must be an array of objects.');
    }

    if (this.model === 'claude') {
      return this.chatWithClaude(messages, options);
    } else {
      return this.chatWithGemini(messages, options, model);
    }
  }

  async chatWithClaude(messages: any[], options = {
    max_tokens : 4000, 
    temperature : 0.15,
    responseFormat : ''
  }) {
    let { max_tokens, temperature, responseFormat } = options;
    if(responseFormat !== '') {
      responseFormat = `\n\nRESPONSE FORMAT. *** YOU are REQUIRED to return the response in JSON formatted with the following format: ${responseFormat} Do NOT SURROUND with Codeblocks ***`
    }
    try {
      let system = "You are a helpful assistant.";
      if (messages[0].role === "system") {
        system = messages[0].content + (responseFormat ? responseFormat : '');
        messages.shift();
      }
      if(responseFormat !== '') {
        messages[messages.length - 1].content += responseFormat;
      }
      let result = await this.client.messages.create({
        messages: messages,
        model: 'claude-3-5-sonnet@20240620',
        system,
        max_tokens: max_tokens || 4000,
        temperature: temperature,
      });
      if(responseFormat !== '') {
        try {
        result = JSON.parse(result.content[0].text);
        } catch (error) {
          result = result.content[0].text;
        }
      }
      return result;
    } catch (error) {
      console.error(error);
      return error;
    }
  }

  async chatWithGemini(messages: any[], options: any, model: string = 'gemini-1.5-pro-001') {
    const { max_tokens, temperature } = options;
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