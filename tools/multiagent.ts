module.exports = {
    enabled: false,
    tools: {
        'multi-assistant': { 
            schema: {
                type: 'function',
                function: {
                    name: 'multi-assistant',
                    description: 'Spawn multiple assistants (long-running AI processes) in parallel. This is useful for any task that can be parallelized, such as running multiple simulations or training multiple models.',
                    parameters: { 
                        prompts: {
                            type: 'array',
                            description: 'An array of prompts to send to the assistant',
                            items: {
                                type: 'object',
                                properties: {
                                    message: {
                                        type: 'string',
                                        description: 'The message to send to the assistant'
                                    }
                                }
                            }
                        }
                    },
                }
            },
            action: async ( {prompts}: any, state: any, api: any) => {
                const AssistantAPI = require('@nomyx/assistant');
                class Assistant extends AssistantAPI {
                    resolver: any;
                    response: any = [];
                    constructor() {
                        super();
                        this.on('chat', async (data: any) => {
                            this.response.push(data);
                        });
                        this.on('session-complete', async (data: any) => {
                            if(this.resolver) {
                                this.resolver(this.response.join('\n'));
                                this.resolver = null;
                            }
                        });
                    }
                    async send(message: string) {
                        if(this.resolver) return;
                        return new Promise((resolve, _reject) => {  
                            this.resolver = resolve;
                            this.emit('send-message', { message });
                        });
                    }
                    static async send(message: string) {
                        const assistant = new Assistant();
                        return await assistant.send(message);
                    }
                }
                let response = [];
                for (const prompt of prompts) {
                    response.push(Assistant.send(prompt.message));
                }
                response = await Promise.all(response);
                api.emit('multi-assistant-response', {response });
            }
        },
        multi_assistant_response: {
            action: (data: any) => {
                console.log(data);
            }
        }
    }
};
export default module.exports;