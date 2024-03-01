"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
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
            action: ({ prompts }, state, api) => __awaiter(void 0, void 0, void 0, function* () {
                const AssistantAPI = require('@nomyx/assistant');
                class Assistant extends AssistantAPI {
                    constructor() {
                        super();
                        this.response = [];
                        this.on('chat', (data) => __awaiter(this, void 0, void 0, function* () {
                            this.response.push(data);
                        }));
                        this.on('session-complete', (data) => __awaiter(this, void 0, void 0, function* () {
                            if (this.resolver) {
                                this.resolver(this.response.join('\n'));
                                this.resolver = null;
                            }
                        }));
                    }
                    send(message) {
                        return __awaiter(this, void 0, void 0, function* () {
                            if (this.resolver)
                                return;
                            return new Promise((resolve, _reject) => {
                                this.resolver = resolve;
                                this.emit('send-message', { message });
                            });
                        });
                    }
                    static send(message) {
                        return __awaiter(this, void 0, void 0, function* () {
                            const assistant = new Assistant();
                            return yield assistant.send(message);
                        });
                    }
                }
                let response = [];
                for (const prompt of prompts) {
                    response.push(Assistant.send(prompt.message));
                }
                response = yield Promise.all(response);
                api.emit('multi-assistant-response', { response });
            })
        },
        multi_assistant_response: {
            action: (data) => {
                console.log(data);
            }
        }
    }
};
exports.default = module.exports;
