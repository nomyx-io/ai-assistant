"use strict";
// const { AssistantRunner } = require('../assistant');
module.exports = {
    state: {},
    schemas: [
        {
            type: 'function',
            function: {
                name: 'multiAssistant',
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
    ],
    tools: {
        'multiAssistant': async (params) => {
            // const prompts = params.prompts;
            // const runner = new AssistantRunner();
            // const results = await Promise.all(prompts.map((prompt) => runner.run(prompt.message) ));
            // return JSON.stringify(results);
        }
    }
};
//# sourceMappingURL=multiagent.js.map