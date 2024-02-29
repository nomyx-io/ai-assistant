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
            action: (params, state) => __awaiter(void 0, void 0, void 0, function* () {
                // we use the asme assistant for all prompts and use the thread id to distinguish between them in the logs
                const assistant = state.assistant;
                const prompts = params.prompts;
                const responses = [];
                for (const prompt of prompts) {
                    const response = yield assistant.send(prompt.message);
                    responses.push(response);
                }
            })
        }
    }
};
exports.default = module.exports;
