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
const eventemitter3_1 = require("eventemitter3");
const prompt_1 = __importDefault(require("./prompt"));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class AssistantAPI extends eventemitter3_1.EventEmitter {
    constructor(serverUrl = 'https://api.openai.com/v1/') {
        super();
        this.debug = false;
        this.actionHandlers = {
            state: {
                action: ({ name, value }, state) => {
                    if (value) {
                        state[name] = value;
                        return state[name];
                    }
                    else {
                        return state[name];
                    }
                },
                nextState: null
            },
            states: {
                action: ({ values }, state) => __awaiter(this, void 0, void 0, function* () {
                    for (const name in values) {
                        state[name] = values[name];
                    }
                    return JSON.stringify(state);
                }),
                nextState: null
            },
            setTasks: {
                action: ({ tasks }, state) => __awaiter(this, void 0, void 0, function* () {
                    state.tasks = tasks;
                    state.current_task = tasks[0];
                    state.percent_complete = 0;
                    state.percent_per_task = 100 / tasks.length;
                    return JSON.stringify(state.tasks);
                }),
                nextState: null
            },
            advance_task: {
                action: (_, state) => __awaiter(this, void 0, void 0, function* () {
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
                }),
                nextState: null
            },
            "assistant-create": {
                action: ({ instructions, model, name, tools }, { assistant, thread, run, requirements }) => __awaiter(this, void 0, void 0, function* () {
                    const { schemas } = this.getTools();
                    assistant = yield this.callAPI('assistants', 'create', {
                        body: {
                            instructions,
                            model,
                            name,
                            schemas
                        }
                    });
                    this.setState({ assistant });
                }),
                nextState: null
            },
            // the plural form of an action is triggered by an API call and its data is automatically passed 
            // to the action handler. this action is triggered by the API and typically drives a state change
            "assistants-create": {
                action: ({ assistant_id }, { assistant, thread, run, requirements }) => __awaiter(this, void 0, void 0, function* () {
                    // the assistant is already in the state, so we don't need to do anything here
                    // to get the data. Here, we will trigger the next action - creating a thread
                    this.emit('thread-create', { assistant_id });
                }),
                nextState: null
            },
            // the singular form of an action triggers the plural form of the API and is typically used to retrieve a single object
            // this action is triggered by the user and its API call will trigger the "assistants-retrieve" action
            "assistant-retrieve": {
                action: ({ assistant_id }, { assistant, thread, run, requirements }) => __awaiter(this, void 0, void 0, function* () {
                    assistant = yield this.callAPI('assistants', 'retrieve', { assistant_id });
                    this.setState({ assistant });
                }),
                nextState: null
            },
            // the plural form of an action is triggered by an API call and its data is automatically passed 
            // to the action handler. this action is triggered by the API and typically drives a state change
            "assistants-retrieve": {
                action: ({ assistant_id }, { assistant, thread, run, requirements }) => __awaiter(this, void 0, void 0, function* () {
                    // the assistant is already in the state, so we don't need to do anything here
                    // to get the data. Here, we will trigger the next action - creating a thread
                    this.emit('thread-create', {});
                }),
                nextState: null
            },
            "show-message": {
                action: ({ message }, state) => __awaiter(this, void 0, void 0, function* () {
                    // console.log(message);
                }),
                nextState: null
            },
            "run-queued": {
                "action": ({ run, thread }, _) => __awaiter(this, void 0, void 0, function* () {
                    if (!run)
                        return;
                    if (run.status === 'completed')
                        this.emit('run-completed', { run, thread });
                    else if (run.status === 'failed')
                        this.emit('run-failed', { run, thread });
                    else if (run.status === 'cancelled')
                        this.emit('run-cancelled', { run, thread });
                    else if (run.status === 'requires_action')
                        this.emit('run-requires-action', { run, thread });
                    else if (run.status === 'expired')
                        this.emit('run-expired', { run, thread });
                    else {
                        run = yield this.callAPI('runs', 'retrieve', { thread_id: run.thread_id, run_id: run.id }, 1000);
                        this.emit('run-queued', { run, thread });
                    }
                }),
                "nextState": null
            },
            "run-cancel": {
                action: ({ run }, { thread }) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield this.callAPI('runs', 'cancel', { thread_id: thread.id, run_id: run.id });
                    }
                    catch (error) {
                        console.error('failed to cancel run: ' + error);
                    }
                }),
                nextState: null
            },
            "run-failed": {
                action: ({ run }, _) => __awaiter(this, void 0, void 0, function* () {
                    console.error(`Run failed: 
Run ID: ${run.id}
Thread ID: ${run.thread_id}
Run Status: ${run.status}
Run Output: ${run.output}
Run Error: ${run.error}`);
                }),
                nextState: null
            },
            "run-expired": {
                action: ({ run }, { thread }) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield this.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                    }
                    catch (error) {
                        console.error('failed to cancel run: ' + error);
                    }
                }),
                nextState: null
            },
            "run-requires-action": {
                action: ({ run }, { toolcallmap, toolOutputs }) => __awaiter(this, void 0, void 0, function* () {
                    if (run.required_action.type === 'submit_tool_outputs') {
                        let tool_calls = yield run.required_action;
                        toolcallmap = toolcallmap || {};
                        tool_calls = tool_calls.submit_tool_outputs.tool_calls;
                        const toolOutputs = [];
                        for (const tool_call of tool_calls) {
                            if (toolcallmap[tool_call.id])
                                continue;
                            let func = this.actionHandlers[tool_call.function.name];
                            if (func) {
                                func = func.action;
                                let result = yield this.callTool(tool_call[tool_call.type].name, JSON.parse(tool_call[tool_call.type].arguments));
                                tool_call.output = result || 'undefined';
                                toolOutputs.push({
                                    tool_call_id: tool_call.id,
                                    output: JSON.stringify(tool_call.output)
                                });
                                toolcallmap[tool_call.id] = tool_call;
                            }
                            else {
                                tool_call.output = `Tool not found: ${tool_call.function.name}`;
                                const availableTools = this.schemas.map((schema) => schema.function.name);
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
                        toolOutputs.length > 0 && (yield this.callAPI('runs', 'submit_tool_outputs', {
                            thread_id: run.thread_id, run_id: run.id, body: {
                                tool_outputs: toolOutputs,
                            }
                        }));
                        this.setState({
                            run: yield this.callAPI('runs', 'retrieve', {
                                thread_id: run.thread_id, run_id: run.id
                            })
                        });
                        this.emit('run-queued', { run: this.state.run });
                    }
                }),
                nextState: null
            },
            "cleanup-old": {
                action: (data, state) => __awaiter(this, void 0, void 0, function* () {
                    let assistants = yield this.callAPI('assistants', 'list');
                    assistants = assistants.data.filter((assistant) => assistant.name === 'Assistant');
                    while (assistants.length > 0) {
                        const delCount = assistants.length;
                        try { }
                        catch (error) {
                            console.error('error deleting assistants', error);
                        }
                        yield Promise.all(assistants.map((assistant) => this.callAPI('assistants', 'delete', { assistant_id: assistant.id })));
                        console.log(`deleted ${delCount} assistants`);
                        assistants = yield this.callAPI('assistants', 'list');
                        assistants = assistants.data.filter((assistant) => assistant.name === 'Assistant');
                    }
                }),
                nextState: null
            }
        };
        this.prompt = prompt_1.default; // state
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
        const tb = { schemas: [], tools: {} };
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
    waitThenEmit(event, data, delay = 1000) { setTimeout(() => this.emit(event, data), delay); }
    setupActionHandler(handlerName, action, nextState, handleType = 'on') {
        this.actionHandlers[handlerName] = { action, nextState };
        try {
            this[handleType](handlerName, (data) => __awaiter(this, void 0, void 0, function* () {
                if (this.beforeAction)
                    this.beforeAction(handlerName, data, this.state, this);
                yield action(data, this.state, this);
                if (this.afterAction)
                    this.afterAction(handlerName, data, this.state, this);
                if (nextState) {
                    this.emit(nextState, this.state);
                }
            }), this);
        }
        catch (error) {
            console.error(`Error setting up action handler: ${handlerName}`, error);
        }
    }
    setupActionHandlers(actionHanderLists = {}) {
        actionHanderLists.forEach((handler) => {
            Object.entries(handler).forEach(([handlerName, handler]) => {
                this.setupActionHandler(handlerName, handler.action, handler.nextState);
            });
        });
    }
    attachFile(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const formData = new FormData();
            formData.append('file', file);
            return this.callAPI('message_files', 'upload', {
                thread_id: this.state.thread_id,
                body: formData
            });
        });
    }
    callSync(handlerName, data) {
        return __awaiter(this, void 0, void 0, function* () { return this.actionHandlers[handlerName].action(data, this.state); });
    }
    listFiles() {
        return __awaiter(this, void 0, void 0, function* () { return this.callAPI('files', 'list', { thread_id: this.state.thread_id }); });
    }
    detachFile(fileId) {
        return __awaiter(this, void 0, void 0, function* () { return this.callAPI('files', 'delete', { thread_id: this.state.thread_id, file_id: fileId }); });
    }
    callTool(tool, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const t = this.actionHandlers[tool];
            if (!t.action)
                return `Tool ${tool} not found. Use bash as an alternative if possible.`;
            return t.action(data, this.state);
        });
    }
    // Improved callAPI method with refined error handling and retry logic
    callAPI(type, api, params = {}, callDelay = 0, retries = 3, retryDelay = 1000) {
        return __awaiter(this, void 0, void 0, function* () {
            const def = this.apisDefinition({
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
            let reqData;
            try {
                if (this.debug) {
                    console.log(type, api);
                }
                if (callDelay > 0) {
                    yield delay(callDelay);
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
                const response = yield fetch(url, reqData);
                if (response.ok) {
                    const r = yield response.json();
                    if (r.id) {
                        if (!this.state[type])
                            this.state[type] = {};
                        this.state[type][r.id] = r;
                        this.state[type.slice(0, -1)] = r;
                    }
                    else if (r.data) {
                        r.data.forEach((d) => {
                            if (!this.state[type])
                                this.state[type] = {};
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
            catch (error) {
                if (retries > 0 && [429, 503].includes(error.status)) {
                    console.warn(`Request failed, retrying after ${retryDelay}ms...`, error);
                    yield delay(retryDelay);
                    return this.callAPI(type, api, params, retries - 1, 0, retryDelay * 2);
                }
                else {
                    this.emit('api-error', { error, type, api });
                    throw 'API request failed.n]]n' + JSON.stringify(reqData, null, 2);
                }
            }
        });
    }
    apisDefinition(state) {
        function get(api) { return { 'get': api }; }
        function post(api, body = {}) { return { 'post': api, 'body': body }; }
        function put(api, body = {}) { return { 'put': api, 'body': body }; }
        function del(api) { return { 'delete': api }; }
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
            }
        };
    }
    // state getters and setters
    setState(newState) {
        this.state = Object.assign(Object.assign({}, this.state), newState);
        this.emit('state', this.state);
    }
    getState() { return JSON.parse(JSON.stringify(this.state)); }
    // session management
    getSessionData(sessionId) { return Object.assign({}, this.state.threads[sessionId].state); }
    setSessionData(sessionId, data) {
        const session = this.state.threads[sessionId];
        session.state = Object.assign(Object.assign({}, session.state), data.state);
        return session.state;
    }
    startSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setupActionHandlers();
            this.emit('session-started', this.getSessionData(sessionId));
        });
    }
}
exports.default = AssistantAPI;
//# sourceMappingURL=assistant.js.map