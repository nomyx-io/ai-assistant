class CallLLMsTool {
  name = 'callLLMs';
  description = 'Call the LLM with the given system prompt and prompts concurrently.';
  methodSignature = 'callLLMs(params: { prompts: string[], system_prompt: string, resultVar?: string }): any';

  async execute({ prompts, system_prompt, resultVar }, api) {
    try {
      if (!prompts || !Array.isArray(prompts) || !system_prompt) {
        throw new Error("The 'prompts' parameter must be an array and 'system_prompt' is required for the 'callLLMs' tool.");
      }
      const results = await Promise.all(prompts.map(async (prompt) => {
        return await api.callTool('callLLM', { prompt, system_prompt });
      }));
      if (resultVar) {
        api.store[resultVar] = results;
      }
      return results;
    } catch (error) {
      const llmResponse = await api.callTool('callLLM', {
        system_prompt: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
        prompt: JSON.stringify({
          error: error.message,
          stackTrace: error.stack,
          context: { prompts, system_prompt, resultVar },
        }),
      });
      if (llmResponse.fix) {
        return llmResponse.fix;
      }
      throw error;
    }
  }
}

module.exports = new CallLLMsTool();