import "dotenv/config";

import AssistantAPI from './assistant';

const delay = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));

class VSCodeAssistant extends AssistantAPI {
	conversation: any = [];
	chatResponse: any = [];

    tools: any = {
        // define tools here
        addNextAction: {
            schema: { type: 'function', function: { name: 'addNextAction', description: 'Add a next action to the list of next actions', parameters: { type: 'object', properties: { message: { type: 'string', description: 'The message to add to the list of next actions' } }, required: ['message'] } } },
            action: async (data: any, state: any, api: any) => {
                const { message } = data;
                state.nextActions = state.nextActions || [];
                state.nextActions.push(message);
                console.log(`Added next action: ${message}`);
                this.setState({ nextActions: state.nextActions });
            },
        },
        listNextActions: {
            schema: { type: 'function', function: { name: 'listNextActions', description: 'List the next actions in the list of next actions', parameters: { type: 'object', properties: {} } } },
            action: async (data: any,  { nextActions }: any , api: any) => {
                console.log(`listing next actions: ${nextActions || []}`);
                return (nextActions && JSON.stringify(nextActions)) || 'No next actions';
            },
        },
    };
	constructor(onChat: any, onSessionComplete: any) {
		super('https://api.openai.com/v1/');
        this.onChat = onChat;
        this.onSessionComplete = onSessionComplete;
		this.apiKey =(process.env as any).OPENAI_API_KEY;
		this.on('chat', this.onAssistantChat);
        this.initTools();
        this.prompt = require('./prompt').default;
	}
    initTools() {
        Object.keys(this.tools).forEach(tool => {
            const schemaName = this.tools[tool].schema.function.name;
            this.actionHandlers = this.actionHandlers || {};
            this.actionHandlers[schemaName] = this.tools[tool];
            this.on(tool, async (data: any) => {
                const maybeFunction = this.actionHandlers[schemaName] ? this.actionHandlers[schemaName].action : null;
                if (!maybeFunction) {
                    console.error(`No action handler found for: ${schemaName}`);
                    return
                }
                await maybeFunction(data, this.state, this);
                if (this.actionHandlers[schemaName].nextState) {
                    if(this.actionHandlers[schemaName].delay) {
                        await delay(this.actionHandlers[schemaName].delay);
                    }
                    await this.actionHandlers[this.actionHandlers[schemaName].nextState].action(data, this.state, this);
                }
            });
            console.log(`Adding action handler for: ${schemaName}`);
        })
    }
	onAssistantChat = (params: any, state: any, api: any) => {
		const { message } = params;
		this.conversation.push(message);
		this.chatResponse.push(message);
		if(this.onChat) {
			this.onChat(message);
		}
    }
	async chatSession(message: any) {
		this.conversation.push(message as string);
		return new Promise((resolve, reject) => {
            this.resolver = resolve;
			const assistant_id = this.state && this.state.assistant_id;
			const thread_id = this.state && this.state.thread_id;
			const listenerInstalled = !!this.onSessionComplete;
			if(!listenerInstalled)
				this.onSessionComplete = ({ message }: any, _state: any, _api: any) => {
					resolve(message.join('\n'));
				}
            return this.emit('send-message',  {
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
	}
	static async chatSession(message: any) {
		const assistant = new VSCodeAssistant((message: any) => {
            console.log(`Assistant: ${message}`);
        }, (message: any) => {
            console.log(`Assistant: ${message}`);
        });
		return assistant.chatSession(message);
	}
}

const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'You: '
});

const assistant = new VSCodeAssistant((message: any) => {
    console.log(`Assistant: ${message}`);
    rl.prompt();
}, (message: any) => {
    console.log(`Assistant: ${message}`);
    rl.prompt();
});


rl.on('line', async (line: any) => {
    const response = await assistant.chatSession(line);
    console.log(`Assistant: ${response}`);
    rl.prompt();
}).on('close', () => {
    console.log('Have a great day!');
    process.exit(0);
});

rl.prompt();
