// This is javascript code for a tool module
class call_agentsTool {

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
            context: { prompts, resultVar },
          }),
        },
      ]);
      llmResponse = llmResponse.content[0].text.trim();
      if (llmResponse.fix) {
        return llmResponse.fix;
      }
      throw error;
    }
  }

}

module.exports = new call_agentsTool();