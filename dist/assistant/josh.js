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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const assistant_1 = __importDefault(require("./assistant"));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
class VSCodeAssistant extends assistant_1.default {
    constructor(onChat, onSessionComplete) {
        super('https://api.openai.com/v1/');
        this.conversation = [];
        this.chatResponse = [];
        this.tools = {
            // define tools here
            addNextAction: {
                schema: { type: 'function', function: { name: 'addNextAction', description: 'Add a next action to the list of next actions', parameters: { type: 'object', properties: { message: { type: 'string', description: 'The message to add to the list of next actions' } }, required: ['message'] } } },
                action: (data, state, api) => __awaiter(this, void 0, void 0, function* () {
                    const { message } = data;
                    state.nextActions = state.nextActions || [];
                    state.nextActions.push(message);
                    console.log(`Added next action: ${message}`);
                    this.setState({ nextActions: state.nextActions });
                }),
            },
            listNextActions: {
                schema: { type: 'function', function: { name: 'listNextActions', description: 'List the next actions in the list of next actions', parameters: { type: 'object', properties: {} } } },
                action: (data, { nextActions }, api) => __awaiter(this, void 0, void 0, function* () {
                    console.log(`listing next actions: ${nextActions || []}`);
                    return (nextActions && JSON.stringify(nextActions)) || 'No next actions';
                }),
            },
        };
        this.onAssistantChat = (params, state, api) => {
            const { message } = params;
            this.conversation.push(message);
            this.chatResponse.push(message);
            if (this.onChat) {
                this.onChat(message);
            }
        };
        this.onChat = onChat;
        this.onSessionComplete = onSessionComplete;
        this.apiKey = process.env.OPENAI_API_KEY;
        this.on('chat', this.onAssistantChat);
        this.initTools();
        this.prompt = require('./prompt').default;
    }
    initTools() {
        Object.keys(this.tools).forEach(tool => {
            const schemaName = this.tools[tool].schema.function.name;
            this.actionHandlers = this.actionHandlers || {};
            this.actionHandlers[schemaName] = this.tools[tool];
            this.on(tool, (data) => __awaiter(this, void 0, void 0, function* () {
                const maybeFunction = this.actionHandlers[schemaName] ? this.actionHandlers[schemaName].action : null;
                if (!maybeFunction) {
                    console.error(`No action handler found for: ${schemaName}`);
                    return;
                }
                yield maybeFunction(data, this.state, this);
                if (this.actionHandlers[schemaName].nextState) {
                    if (this.actionHandlers[schemaName].delay) {
                        yield delay(this.actionHandlers[schemaName].delay);
                    }
                    yield this.actionHandlers[this.actionHandlers[schemaName].nextState].action(data, this.state, this);
                }
            }));
            console.log(`Adding action handler for: ${schemaName}`);
        });
    }
    chatSession(message) {
        return __awaiter(this, void 0, void 0, function* () {
            this.conversation.push(message);
            return new Promise((resolve, reject) => {
                this.resolver = resolve;
                const assistant_id = this.state && this.state.assistant_id;
                const thread_id = this.state && this.state.thread_id;
                const listenerInstalled = !!this.onSessionComplete;
                if (!listenerInstalled)
                    this.onSessionComplete = ({ message }, _state, _api) => {
                        resolve(message.join('\n'));
                    };
                return this.emit('send-message', {
                    message,
                    assistant_id,
                    thread_id,
                    requirements: message,
                    percent_complete: 0,
                    status: 'in progress',
                    tasks: [],
                    current_task: '',
                });
            });
        });
    }
    static chatSession(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const assistant = new VSCodeAssistant((message) => {
                console.log(`Assistant: ${message}`);
            }, (message) => {
                console.log(`Assistant: ${message}`);
            });
            return assistant.chatSession(message);
        });
    }
}
const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'You: '
});
const assistant = new VSCodeAssistant((message) => {
    console.log(`Assistant: ${message}`);
    rl.prompt();
}, (message) => {
    console.log(`Assistant: ${message}`);
    rl.prompt();
});
rl.on('line', (line) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield assistant.chatSession(line);
    console.log(`Assistant: ${response}`);
    rl.prompt();
})).on('close', () => {
    console.log('Have a great day!');
    process.exit(0);
});
rl.prompt();
