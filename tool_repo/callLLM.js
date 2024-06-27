const { AnthropicVertex } = require('@anthropic-ai/vertex-sdk');
const { VertexAI } = require('@google-cloud/vertexai');

class Conversation {
  constructor(model) {
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

  async chat(messages, options = {
    max_tokens: 4000,
    temperature: 0.15,
    responseFormat: ''
  }, model = 'gemini-1.5-pro-001') {
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array of objects.');
    }

    if (this.model === 'claude') {
      return this.chatWithClaude(messages, options);
    } else {
      return this.chatWithGemini(messages, options, model);
    }
  }

  async chatWithClaude(messages, options = {
    max_tokens: 4000,
    temperature: 0.15,
    responseFormat: ''
  }) {
    let { max_tokens, temperature, responseFormat } = options;
    if (responseFormat !== '') {
      responseFormat = `\n\nRESPONSE FORMAT. *** YOU are REQUIRED to return the response in JSON formatted with the following format: ${responseFormat} Do NOT SURROUND with Codeblocks ***`;
    }
    try {
      let system = "You are a helpful assistant.";
      if (messages[0].role === "system") {
        system = messages[0].content + (responseFormat ? responseFormat : '');
        messages.shift();
      }
      if (responseFormat !== '') {
        messages[messages.length - 1].content += responseFormat;
      }
      let result = await this.client.messages.create({
        messages: messages,
        model: 'claude-3-5-sonnet@20240620',
        system,
        max_tokens: max_tokens || 4000,
        temperature: temperature,
      });
      if (responseFormat !== '') {
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

  async chatWithGemini(messages, options, model = 'gemini-1.5-pro-001') {
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

class CallLLMTool {
  static name = 'callLLM';
  static methodSignature = 'callLLM(params: { prompt: string, system_prompt?: string, model?: string, responseFormat?: string, resultVar?: string }[]): any';
  static description = 'Call the LLM with the given system prompt and prompt, optionally specifying the model and response format and setting a result variable.';

  static async execute(params, api) {
    if (!Array.isArray(params)) params = [params];
    for (const param of params) {
      let { prompt, system_prompt, model, responseFormat, resultVar } = param;
      try {
        if (!prompt) {
          throw new Error("Both 'prompt' and 'system_prompt' are required parameters for the 'callLLM' tool.");
        }
        if (!system_prompt) system_prompt = prompt;
        model = model || 'claude';
        if (model !== 'claude' && model !== 'gemini') {
          throw new Error("Invalid model specified. Choose either 'claude' or 'gemini'.");
        }
        if (responseFormat) {
          system_prompt = `${system_prompt}. Response Format: You MUST respond with a JSON - encoded string in the following format: \n\`\`\`typescript\n${responseFormat}\n\`\`\`\n`;
        }
        const convo = new Conversation(model);
        const response = await convo.chat([
          {
            role: 'system',
            content: system_prompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ]);
        const data = response.content[0].text.trim();
        if (responseFormat) {
          try {
            const rr = JSON.parse(data);
            if (resultVar) {
              api.store[resultVar] = rr;
            }
            return rr;
          } catch (error) {
            api.emit('error', `JSON parsing failed for LLM response: ${data}`);
            if (resultVar) {
              api.store[resultVar] = data;
            }
            return data;
          }
        } else {
          if (resultVar) {
            api.store[resultVar] = data;
          }
          return data;
        }
      } catch (error) {
        const llmResponse = await api.callTool('callLLM', {
          system_prompt: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
          prompt: JSON.stringify({
            error: error.message,
            stackTrace: error.stack,
            context: { prompt, system_prompt, model, responseFormat, resultVar },
          }),
        });
        if (llmResponse.fix) {
          return llmResponse.fix;
        }
        throw error;
      }
    }
  }
}

module.exports = CallLLMTool;