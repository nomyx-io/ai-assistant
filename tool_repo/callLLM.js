// This is javascript code for a tool module
class callLLMTool {

  async execute(params, api) {
    if (!Array.isArray(params))
      params = [params];
    for (const param of params) {
      let { prompt, system_prompt, model, responseFormat, resultVar } = param;
      try {
        if (!prompt) {
          throw new Error("Both 'prompt' and 'system_prompt' are required parameters for the 'callLLM' tool.");
        }
        if (!system_prompt)
          system_prompt = prompt;
        model = model || 'claude';
        if (model !== 'claude' && model !== 'gemini') {
          throw new Error("Invalid model specified. Choose either 'claude' or 'gemini'.");
        }
        if (responseFormat) {
          system_prompt = `${system_prompt}. Response Format: You MUST respond with a JSON - encoded string in the following format: \n\`\`\`typescript\n${responseFormat}\n\`\`\`\n`;
        }
        const convo = new api.conversation(model);
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
            const isValidJson = api.jsonValidator(responseFormat, data);
            if (!isValidJson) {
              throw new Error('Invalid JSON structure in LLM response. Actual response: ' + data + ' Expected response format: ' + responseFormat);
            }
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
        let llmResponse = await api.conversation.chat([
          {
            role: 'system',
            content: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              error: error.message,
              stackTrace: error.stack,
              context: { prompt, system_prompt, model, responseFormat, resultVar },
            }),
          },
        ]);
        llmResponse = llmResponse.content[0].text.trim();
        throw error;
      }
    }
  }

}

module.exports = new callLLMTool();