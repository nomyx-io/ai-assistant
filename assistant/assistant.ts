import "dotenv/config";
import { EventEmitter } from "eventemitter3";
import prompt from "./prompt";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default class AssistantAPI extends EventEmitter {
    prompt: string;
    state: any;
    model: string;
    name: string;
    debug: boolean = false;
    schemas: any; 
    serverUrl: string;
    beforeAction?: (action: string, data: any, state: any, self: any) => void;
    afterAction?: (action: string, data: any, state: any, self: any) => void;
    apiKey: any;
    constructor(serverUrl = 'https://api.openai.com/v1/') {
        super();
        this.prompt =  prompt // state
        this.state = {
            requirements: 'no requirements set',
            percent_complete: 0,
            status: 'idle',
            tasks: [],
            current_task: '',
            notes: 'no AI notes.',
            chat: 'no chat messages'
        };
        this.model = 'gpt-4-turbo-preview';
        this.name = 'Assistant';
        this.debug = false;
        this.schemas = [
            { type: 'function', function: { name: 'say-openai', description: 'Say something aloud using the openai speech interface', parameters: { type: 'object', properties: { message: { type: 'string', description: 'The message to say' }, voice: { type: 'string', description: 'The voice to use. options are alloy, echo, fable, onyx, nova, and shimmer' }, speed: { type: 'number', description: 'The speed of the voice. 1 is normal, 0.5 is half speed, 2 is double speed' } }, required: ['message'] } } },
            { type: 'function', function: { name: 'state', description: 'Get or set a named variable\'s value. Call with no value to get the current value. Call with a value to set the variable', parameters: { type: 'object', properties: { name: { type: 'string', description: 'The variable\'s name. required' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } } },
            { type: 'function', function: { name: 'states', description: 'Set multiple state variables at once', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The variables to set', additionalProperties: { type: 'string' } } }, required: ['values'] } } },
            { type: 'function', function: { name: 'advance_task', description: 'Advance the current task to the next task' } },
            { type: 'function', function: { name: 'set_tasks', description: 'Set the tasks to the given tasks. Also sets the current task to the first task in the list', parameters: { type: 'object', properties: { tasks: { type: 'array', description: 'The tasks to set', items: { type: 'string' } } }, required: ['tasks'] } } },
        ];
        this.serverUrl = serverUrl;
        this.callAPI = this.callAPI.bind(this);
    }
    getTools() {
        // get the schemas and use those to prepare a list of tools. Tools are event handlers that can be called by the AI to perform actions.
        const tb: any = { schemas: [], tools: {} }
        for (const schema of this.schemas) {
            if (schema.type === 'function') {
                const tool_name = schema.function.name;
                if (this.actionHandlers[tool_name]) {
                    tb.tools[tool_name] = this.actionHandlers[tool_name].action;
                    tb.schemas.push(schema);
                }
            }
        }
        return tb;
    }
    waitThenEmit(event: any, data: any, delay = 1000) { setTimeout(() => this.emit(event, data), delay); }
    setupActionHandler(handlerName: any, action: any, nextState: any, handleType = 'on') {
        this.actionHandlers[handlerName] = { action, nextState };
        try {
            (this as any)[handleType](handlerName, async (data: any) => {
                if (this.beforeAction) this.beforeAction(handlerName, data, this.state, this);
                await action(data, this.state, this);
                if (this.afterAction) this.afterAction(handlerName, data, this.state, this);
                if (nextState) {
                    this.emit(nextState, this.state);
                }
            }, this);
        }
        catch (error) {
            console.error(`Error setting up action handler: ${handlerName}`, error);
        }
    }
    setupActionHandlers(actionHanderLists: any = {}) {
        actionHanderLists.forEach((handler: any) => {
            Object.entries(handler).forEach(([handlerName, handler]: any) => {
                this.setupActionHandler(handlerName, handler.action, handler.nextState);
            });
        });
    }
    async attachFile(file: any) {
        const formData = new FormData();
        formData.append('file', file);
        return this.callAPI('message_files', 'upload', {
            thread_id: this.state.thread_id,
            body: formData
        });
    }
    async callSync(handlerName: any, data: any) { 
        try {
            return this.actionHandlers[handlerName].action(data, this.state); 
        } catch (error) {
            throw new Error(`Error calling action handler: ${handlerName}`);
        }
    }
    async listFiles() { return this.callAPI('files', 'list', { thread_id: this.state.thread_id }); }
    async detachFile(fileId: any) { return this.callAPI('files', 'delete', { thread_id: this.state.thread_id, file_id: fileId }); }
    async callTool(tool: any, data: any) {
        const t = this.actionHandlers[tool]
        if (!t.action) return `Tool ${tool} not found. Use bash as an alternative if possible.`
        return t.action(data, this.state);
    }
    // Improved callAPI method with refined error handling and retry logic
    async callAPI(type: any, api: any, params: any = {}, callDelay = 0, retries = 3, retryDelay = 1000): Promise<any> {
        const def: any = this.apisDefinition({
            // Corrected from assistant_.d to assistant_id
            assistant_id: params.assistant_id,
            thread_id: params.thread_id,
            run_id: params.run_id,
            message_id: params.message_id,
            file_id: params.file_id,
            step_id: params.step_id,
            body: params.body
        });
        const func = def[type][api];
        const method = Object.keys(func)[0];
        const path = func[method].join('/');
        const url = new URL(path, this.serverUrl);
        let reqData: any;
        try {
            if (this.debug) {
                console.log(type, api);
            }
            if (callDelay > 0) {
                await delay(callDelay);
            }
            reqData = {
                method: method.toUpperCase(),
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey || process.env.OPENAI_API_KEY}`,
                    "OpenAI-Beta": "assistants=v1",
                    "Accept": "application/json",
                },
                body: JSON.stringify(params.body)
            };
            const response = await fetch(url, reqData);
            if (response.ok) {
                const r = await response.json();
                if (r.id) {
                    if (!this.state[type]) this.state[type] = {};
                    this.state[type][r.id] = r;
                    this.state[type.slice(0, -1)] = r;
                } else if (r.data) {
                    r.data.forEach((d: any) => {
                        if (!this.state[type]) this.state[type] = {};
                        this.state[type][d.id] = d;
                    });
                }
                this.emit(`${type}-${api}`, response);
                return r;
            }
            else {
                console.error(`${response.status}: ${response.statusText}`);
                console.error(`${type}-${api}`, response);
                throw new Error(`${response.status}: ${response.statusText}`);
            }
        }
        catch (error: any) {
            if (retries > 0 && [429, 503].includes(error.status)) {
                console.warn(`Request failed, retrying after ${retryDelay}ms...`, error);
                await delay(retryDelay);
                return this.callAPI(type, api, params, retries - 1, 0, retryDelay * 2);
            }
            else {
                this.emit('api-error', { error, type, api });
                throw 'API request failed.n]]n' + JSON.stringify(reqData, null, 2);
            }
        }
    }
    apisDefinition(state: any) {
        function get(api: any) { return { 'get': api }; }
        function post(api: any, body = {}) { return { 'post': api, 'body': body }; }
        function put(api: any, body = {}) { return { 'put': api, 'body': body }; }
        function del(api: any) { return { 'delete': api }; }
        return {
            'assistants': {
                'list': get(['assistants']),
                'create': post(['assistants']),
                'retrieve': get(['assistants', state.assistant_id]),
                'modify': put(['assistants', state.assistant_id], state.body),
                'delete': del(['assistants', state.assistant_id]),
            },
            'threads': {
                'create': post(['threads']),
                'retrieve': get(['threads', state.thread_id]),
                'modify': put(['threads', state.thread_id], state.body),
                'delete': del(['threads', state.thread_id]),
            },
            "messages": {
                'list': get(['threads', state.thread_id, 'messages']),
                'create': post(['threads', state.thread_id, 'messages'], state.body),
                'retrieve': get(['threads', state.thread_id, 'messages', state.message_id]),
                'modify': put(['threads', state.thread_id, 'messages', state.message_id], state.body),
            },
            "message_files": {
                "list": get(['threads', state.thread_id, 'messages', state.message_id, 'files']),
                "retrieve": get(['threads', state.thread_id, 'messages', state.message_id, 'files', state.file_id]),
                'upload': post(['threads', state.thread_id, 'messages', state.message_id, 'files'], state.body),
                'delete': del(['threads', state.thread_id, 'messages', state.message_id, 'files', state.file_id]),
            },
            'runs': {
                'create': post(['threads', state.thread_id, 'runs'], state.body),
                'list': get(['threads', state.thread_id, 'runs']),
                'retrieve': get(['threads', state.thread_id, 'runs', state.run_id]),
                'modify': put(['threads', state.thread_id, 'runs', state.run_id], state.body),
                'cancel': post(['threads', state.thread_id, 'runs', state.run_id, 'cancel']),
                'submit_tool_outputs': post(['threads', state.thread_id, 'runs', state.run_id, 'submit_tool_outputs'], state.body),
                'create_thread_and_run': post(['threads', 'runs'], state.body),
            },
            'run_steps': {
                'list': get(['threads', state.thread_id, 'runs', state.run_id, 'steps']),
                'retrieve': get(['threads', state.thread_id, 'runs', state.run_id, 'steps', state.step_id]),
                'modify': put(['threads', state.thread_id, 'runs', state.run_id, 'steps', state.step_id], state.body),
                'delete': del(['threads', state.thread_id, 'runs', state.run_id, 'steps', state.step_id]),
            },
            'files': {
                'list': get(['threads', state.thread_id, 'files']),
                'retrieve': get(['threads', state.thread_id, 'files', state.file_id]),
                'upload': post(['threads', state.thread_id, 'files'], state.body),
                'delete': del(['threads', state.thread_id, 'files', state.file_id]),
            },
            'images': {
                'generations': post(['images', 'generations'], state.body),
            },
            'audio': {
                'speech': post(['audio', 'speech'], state.body),
            }
        };
    }
    // state getters and setters
    setState(newState: any) {
        this.state = { ...this.state, ...newState };
        this.emit('state', this.state);
    }
    getState() { return JSON.parse(JSON.stringify(this.state)); }

    // session management
    getSessionData(sessionId: string) { return { ...this.state.threads[sessionId].state }; }
    setSessionData(sessionId: string, data: any): void {
        const session = this.state.threads[sessionId];
        session.state = { ...session.state, ...data.state };
        return  session.state;
    }
    async startSession(sessionId: string){
        this.setupActionHandlers();
        this.emit('session-started', this.getSessionData(sessionId));
    }

    actionHandlers: any = {
        state: {
            action: ({ name, value }: any, state: any) => {
                if (value) {
                    state[name] = value;
                    return state[name];
                } else {
                    return state[name];
                }
            },
            nextState: null
        },
        states: {
            action: async ({ values }: any, state: any) => {
                for (const name in values) {
                    state[name] = values[name];
                }
                return JSON.stringify(state);
            },
            nextState: null
        },
        setTasks: {
            action: async ({ tasks }: any, state: any) => {
                state.tasks = tasks;
                state.current_task = tasks[0];
                state.percent_complete = 0;
                state.percent_per_task = 100 / tasks.length;
                return JSON.stringify(state.tasks);
            },
            nextState: null
        },
        advance_task: {
            action: async (_: any, state: any) => {
                if (state.tasks.length === 0) {
                    return 'no more tasks';
                }
                else {
                    state.tasks.shift();
                    state.current_task = state.tasks[0];
                    state.percent_complete += state.percent_per_task;
                    console.log('task advanced to:' + state.current_task);
                    return state.current_task;
                }
            },
            nextState: null
        },
        "say-openai": {
            action: async ({ message, voice, speed }: any, state: any) => {
                const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
                if (!voice || !voices.includes(voice)) voice = 'alloy';
                if (!speed) speed = 1;
                const audio = await this.callAPI('audio', 'speech', {
                    body: {
                        message,
                        voice,
                        speed
                    }
                });
                if(globalThis.Audio){
                    const audioBlob = await fetch(audio.url).then((r) => r.blob());
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audioElement = new Audio(audioUrl);
                    audioElement.play();
                }
                return '(aloud) ' + message;
            },
            nextState: null
        },
        "assistant-create": {
            action: async ({ instructions, model, name, tools }: any, { assistant, thread, run, requirements }: any) => {
                const { schemas } = this.getTools();
                assistant = await this.callAPI('assistants', 'create', {
                    body: {
                        instructions,
                        model,
                        name,
                        schemas
                    }
                });
                this.setState({ assistant });
            },
            nextState: null
        },
        // the plural form of an action is triggered by an API call and its data is automatically passed 
        // to the action handler. this action is triggered by the API and typically drives a state change
        "assistants-create": {
            action: async ({ assistant_id }: any, { assistant, thread, run, requirements }: any) => {
                // the assistant is already in the state, so we don't need to do anything here
                // to get the data. Here, we will trigger the next action - creating a thread
                this.emit('thread-create', { assistant_id });
            },
            nextState: null
        },
        // the singular form of an action triggers the plural form of the API and is typically used to retrieve a single object
        // this action is triggered by the user and its API call will trigger the "assistants-retrieve" action
        "assistant-retrieve": {
            action: async ({ assistant_id }: any, { assistant, thread, run, requirements }: any) => {
                assistant = await this.callAPI('assistants', 'retrieve', { assistant_id });
                this.setState({ assistant });
            },
            nextState: null
        },
        // the plural form of an action is triggered by an API call and its data is automatically passed 
        // to the action handler. this action is triggered by the API and typically drives a state change
        "assistants-retrieve": {
            action: async ({ assistant_id }: any, { assistant, thread, run, requirements }: any) => {
                // the assistant is already in the state, so we don't need to do anything here
                // to get the data. Here, we will trigger the next action - creating a thread
                this.emit('thread-create', {});
            },
            nextState: null
        },
        "show-message": {
            action: async ({ message }: any, state: any) => {
                // console.log(message);
            },
            nextState: null
        },
        "run-queued": {
            "action": async ({ run }: any, { thread }: any) => {
                if (!run) return;

                if (run.status === 'completed') this.emit('run-completed', { run, thread });
                else if (run.status === 'failed') this.emit('run-failed', { run, thread });
                else if (run.status === 'cancelled') this.emit('run-cancelled', { run, thread });
                else if (run.status === 'requires_action') this.emit('run-requires-action', { run, thread });
                else if (run.status === 'expired') this.emit('run-expired', { run, thread });
                else {
                    run = await this.callAPI('runs', 'retrieve', { thread_id: run.thread_id, run_id: run.id }, 1000);
                    this.emit('run-queued', { run, thread });
                }
            },
            "nextState": null
        },
        "run-cancel": {
            action: async ({ run }: any, { thread }: any) => {
                try {
                    await this.callAPI('runs', 'cancel', { thread_id: thread.id, run_id: run.id });
                } catch (error: any) { console.error('failed to cancel run: ' + error); }
            },
            nextState: null
        },
        "run-failed": {
            action: async ({ run }: any, _: any) => {
                console.error(`Run failed: 
Run ID: ${run.id}
Thread ID: ${run.thread_id}
Run Status: ${run.status}
Run Output: ${run.output}
Run Error: ${run.error}`);
            },
            nextState: null
        },
        "run-expired": {
            action: async ({ run }: any, { thread }: any) => {
                try {
                    await this.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                } catch (error: any) { console.error('failed to cancel run: ' + error); }
            },
            nextState: null
        },
        "run-requires-action": {
            action: async ({ run }: any, { toolcallmap, toolOutputs }: any) => {
                if (run.required_action.type === 'submit_tool_outputs') {
                    let tool_calls = await run.required_action;
                    toolcallmap = toolcallmap || {};
                    tool_calls = tool_calls.submit_tool_outputs.tool_calls;
                    const toolOutputs = [];
                    for (const tool_call of tool_calls) {
                        if (toolcallmap[tool_call.id])
                            continue;
                        let func = this.actionHandlers[tool_call.function.name];
                        if (func) {
                            func = func.action;
                            let result = await this.callTool(tool_call[tool_call.type].name, JSON.parse(tool_call[tool_call.type].arguments));
                            tool_call.output = result || 'undefined';
                            toolOutputs.push({
                                tool_call_id: tool_call.id,
                                output: JSON.stringify(tool_call.output)
                            });
                            toolcallmap[tool_call.id] = tool_call;
                        }
                        else {
                            tool_call.output = `Tool not found: ${tool_call.function.name}`;
                            const availableTools = this.schemas.map((schema: any) => schema.function.name);
                            tool_call.output += `\nAvailable tools: ${availableTools.join(', ')}`;
                            toolOutputs.push({
                                tool_call_id: tool_call.id,
                                output: tool_call.output
                            });
                            toolcallmap[tool_call.id] = tool_call;
                        }
                    }
                    this.setState({
                        toolcallmap,
                        toolOutputs
                    });
                    toolOutputs.length > 0 && await this.callAPI('runs', 'submit_tool_outputs', {
                        thread_id: run.thread_id, run_id: run.id, body: {
                            tool_outputs: toolOutputs,
                        }
                    });
                    this.setState({
                        run: await this.callAPI('runs', 'retrieve', {
                            thread_id: run.thread_id, run_id: run.id
                        })
                    });
                    this.emit('run-queued', { run: this.state.run });
                }
            },
            nextState: null
        },
        "cleanup-old": {
            action: async (data: any, state: any) => {
                let assistants = await this.callAPI('assistants', 'list');
                assistants = assistants.data.filter((assistant: any) => assistant.name === 'Assistant');
                while (assistants.length > 0) {
                    const delCount = assistants.length;
                    try { } catch (error) { console.error('error deleting assistants', error); }
                    await Promise.all(assistants.map((assistant: any) => this.callAPI('assistants', 'delete', { assistant_id: assistant.id })));
                    console.log(`deleted ${delCount} assistants`);
                    assistants = await this.callAPI('assistants', 'list');
                    assistants = assistants.data.filter((assistant: any) => assistant.name === 'Assistant');
                }
            },
            nextState: null
        }
    }
}

