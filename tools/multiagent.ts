module.exports = {
    tools: {
        'multi-assistant': { 
            schema: {
                type: 'function',
                function: {
                    name: 'multi-assistant',
                    description: 'Spawn multiple assistants (long-running AI processes) in parallel. This is useful for building an html page where each agent handles a different part of the page.', 
                    parameters: { 
                        type: 'object', 
                        properties: { 
                            prompts: { 
                                type: 'array', 
                                description: 'The prompts to spawn', 
                                items: { 
                                    type: 'object', 
                                    properties: { 
                                        message: { 
                                            type: 'string', 
                                            description: 'The message to send to the assistant' 
                                        } 
                                    }, 
                                    required: ['message'] 
                                }
                            } 
                        }, required: ['agents'] 
                    }
                }
            },
            action: async (params: any, state: any) => {
                // we use the asme assistant for all prompts and use the thread id to distinguish between them in the logs
                const assistant = state.assistant;
                const prompts = params.prompts;
                const responses = [];
                for (const prompt of prompts) {
                    const response = await assistant.send(prompt.message);
                    responses.push(response);
                }
            }
        }
    }
};
export default module.exports;