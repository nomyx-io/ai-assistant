({ prompts, resultVar }, api) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (!prompts || !Array.isArray(prompts)) {
                    throw new Error("The 'prompts' parameter must be an array for the 'call_agents' tool.");
                }
                const results = yield Promise.all(prompts.map((prompt) => __awaiter(void 0, void 0, void 0, function* () {
                    return yield api.callTool('call_agent', { prompt, model: 'claude' });
                })));
                if (resultVar) {
                    api.store[resultVar] = results;
                }
                return results;
            }
            catch (error) {
                const llmResponse = yield api.callTool('callLLM', {
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
        })