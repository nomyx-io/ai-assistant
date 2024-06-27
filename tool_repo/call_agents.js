class CallAgents {
  name = 'call_agents';
  description = 'Call multiple agents with the given tasks to perform.';
  methodSignature = 'call_agents(params: { prompts: string[], resultVar?: string }): any';

  async execute({ prompts, resultVar }, api) {
    try {
      if (!prompts || !Array.isArray(prompts)) {
        throw new Error("The 'prompts' parameter must be an array for the 'call_agents' tool.");
      }
      const results = await Promise.all(prompts.map(async (prompt) => {
        return await api.callTool('call_agent', { prompt, model: 'claude' });
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
          context: { prompts, resultVar },
        }),
      });
      if (llmResponse.fix) {
        return llmResponse.fix;
      }
      throw error;
    }
  }
}

module.exports = new CallAgents();