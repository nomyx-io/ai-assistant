import "dotenv/config";
import { EventEmitter } from "eventemitter3";

interface State {
    [key: string]: any;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default class AssistantAPI extends EventEmitter {
    prompt: string;
    state: State;
    model: string;
    name: string;
    debug: boolean = false;
    schemas: any;
    serverUrl: string;
    beforeAction?: (action: string, data: any, state: State, self: any) => void;
    afterAction?: (action: string, data: any, state: State, self: any) => void;
    apiKey: any;
    constructor(serverUrl = 'https://api.openai.com/v1/') {
        super();
        this.prompt = `You are a helpful. highly-skilled, highly resourceful assistant enabled with a number of powerful tools running in a file system context. Your job is to transform the files in the current working folder so that they meet the requirements of the user.

# Application State
You are enabled with a persistent application state that you can use to store and retrieve information across multiple interactions. Use your state to keep track of the files and folders in the current working directory, the user's requirements, and any other information that you need to manage the user's requests.
- use the 'state' function to get or set a named variable's value
- use the 'states' function to set multiple state variables at once

# Tasks
You can define a list of tasks that you want to accomplish and then advance through them one at a time.
- use the 'set_tasks' function to set the tasks to the given tasks. This will set the current task to the first task in the list as well as set the percent_complete to 0
- use the 'advance_task' function to advance the current task to the next task. This will automatically set the percent_complete to the appropriate value, which you should adjust if necessary. Once you have completed the last task, the percent_complete will be set to 100 and the status will be set to 'complete'

***SET PERCENT COMPLETE TO 100% WHEN YOU ARE DONE, WHEN REQUIREMENTS ARE EMPTY, OR ON ERROR. OTHERWISE, YOU WILL BE STUCK IN A LOOP***

# State Variables
The following state variables are available to you throughout your session:
- 'requirements': the requirements that you are currently working on
- 'current_task': the current task that you are working on
- 'percent_complete': the percentage of the overall requirements that you have completed
- 'status': the status of the current session. This can be 'incomplete', or 'complete'
- 'chat': the latest chat message that you have received or sent
- 'notes': any notes that you have taken during the session
You can add any other state variables that you need to manage your session.

# Tools
You have access to a number of tools that you can use to interact with the web page and perform various actions. You can use these tools to accomplish your tasks and meet the requirements of the user. Tools include:
- 'file'/'files': read, write and modify files on the users computer
- 'selector/selectors': Work with the HTML of the specified page.
YOU HHAVE MANY MORE TOOLS available to you. You are expected to self-investigate and learn how to use them when the need arises.

***THIS IS IMPORTANT SO PAY ATTENTION***
- DO NOT TARGET 'body' AS A SELECTOR. TARGET "" to target the entire page.
- ALWAYS PREFER APPENDING OVER REPLACING. This is to avoid breaking the page.

***SET PERCENT COMPLETE TO 100% WHEN YOU ARE DONE, WHEN REQUIREMENTS ARE EMPTY, OR ON ERROR. OTHERWISE, YOU WILL BE STUCK IN A LOOP***

# Output
Set the 'chat' state variable to the message that you want to display to the user. This will be displayed in the chat window.
Output your primary response as a JSON object with the following structure:
{
  "requirements": "the requirements that you are currently working on",
  "percent_complete": 0,
  "status": "incomplete",
  "tasks": [],
  "current_task": "the current task that you are working on",
  "notes": "any notes that you have taken during the session",
  "chat": "the latest chat message that you have received or sent",
  "show_html": false, // set to true to display the HTML of the page on the next turn
}
ALWAYS output RAW JSON - NO surrounding codeblocks.
  `; // state
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
            { type: 'function', function: { name: 'selector', description: 'Get or set a selector\'s value on the page. Call with blank selector for the entire page. Call with no value to get the current value. Call with a value to set the elements innerHTML', parameters: { type: 'object', properties: { selector: { type: 'string', description: 'The selector to get or set. If not present, the function will return the entire page' }, value: { type: 'string', description: 'The new value to set the selector to. If not present, the function will return the current value' } } } } },
            { type: 'function', function: { name: 'states', description: 'Set multiple state variables at once', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The variables to set', additionalProperties: { type: 'string' } } }, required: ['values'] } } },
            { type: 'function', function: { name: 'selectors', description: 'Set multiple selectors at once', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The selectors to set', additionalProperties: { type: 'string' } } }, required: ['values'] } } },
            { type: 'function', function: { name: 'advance_task', description: 'Advance the current task to the next task' } },
            { type: 'function', function: { name: 'eval', description: 'Evaluate the given code and return the result', parameters: { type: 'object', properties: { code: { type: 'string', description: 'The code to evaluate' } }, required: ['code'] } } },
            { type: 'function', function: { name: 'set_tasks', description: 'Set the tasks to the given tasks. Also sets the current task to the first task in the list', parameters: { type: 'object', properties: { tasks: { type: 'array', description: 'The tasks to set', items: { type: 'string' } } }, required: ['tasks'] } } },
            { type: "function", function: { name: "multi_assistant", description: "Spawn multiple assistants (long-running AI processes) in parallel. This is useful for building an html page where each agent handles a different part of the page.", "parameters": { "type": "object", "properties": { "prompts": { "type": "array", "description": "The prompts to spawn", "items": { "type": "object", "properties": { "message": { "type": "string", "description": "The message to send to the assistant" } }, "required": ["message"] } } }, "required": ["agents"] } } }
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
    addtool(tool: any, schema: any) {
        this.schemas.push(schema);
        this.actionHandlers[tool] = {
            action: async (data: any, state: State) => {
                try {
                    return await this.callSync(tool, data);
                } catch (error: any) {
                    console.error('Error calling tool: ' + tool, error);
                    return error.message;
                }
            }, nextState: null
        };
        this.setupActionHandler(tool, this.actionHandlers[tool].action, this.actionHandlers[tool].nextState);
    }
    async callTool(tool: any, data: any) {
        const t = this.actionHandlers[tool]
        if(!t.action) return `Tool ${tool} not found. Use bash as an alternative if possible.`
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
    apisDefinition(state: State) {
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
        };
    }
    setState(newState: State) {
        this.state = { ...this.state, ...newState };
        this.emit('state', this.state);
    }
    getState() { return JSON.parse(JSON.stringify(this.state)); }
    waitThenEmit(event: any, data: any, delay = 1000) {
        setTimeout(() => this.emit(event, data), delay);
    }
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
    async callSync(handlerName: any, data: any) {
        return this.actionHandlers[handlerName].action(data, this.state);
    }
    private _state({ name, value }: any, state: any) {
        if (value) {
            state[name] = value;
            return state[name];
        } else {
            return state[name];
        }
    }
    actionHandlers: any = {
        state: {
            action: this._state,
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
        selectors: {
            action: async ({ values }: any, state: State) => {
                const results = [];
                const selectorFunction = this.actionHandlers.selector;
                for (const selector in values) {
                    results.push(selectorFunction({ selector, value: values[selector] }, state));
                }
                return results.join('\n') || 'undefined';
            },
            nextState: null
        },
        selector: {
            action: async ({ selector, value }: any, state: State) => {
                function extractBody(str: any) {
                    let body = str.match(/<body.*?>([\s\S]*?)<\/body>/);
                    body = body ? body[1] : str;
                    return body;
                }
                try {
                    const oc = document.getElementById('pagedata');
                    if (oc) {
                        const seld = selector && selector.trim().length > 0 ? oc.querySelector(selector) : oc;
                        if (value && seld) {
                            value = value.replace(/\\n/g, '\n');
                            value = value.replace(/```json/g, '').replace(/```/g, '');
                            value = extractBody(value);
                            seld.innerHTML = value;
                            localStorage.setItem('html', value);
                            return seld.innerHTML;
                        } else {
                            return 'selector not found. Target "" to target the entire page';
                        }
                    }
                } catch (error: any) {
                    return error.message;
                }
            },
            nextState: null
        },
        setTasks: {
            action: async ({ tasks }: any, state: State) => {
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
        eval: {
            action: async ({ code }: any, state: State) => {
                async function evalInContext(js: string, context: any) {
                    return function () { return eval(js); }.call(context);
                }
                try {
                    const results = await evalInContext(code, globalThis);
                    return results instanceof Object ? JSON.stringify(results) : results;
                } catch (error: any) {
                    return error.message;
                }
            },
            nextState: null
        },
        "show-message": {
            action: async ({ message }: any, state: State) => {
                // console.log(message);
            },
            nextState: null
        },
        "run-queued": {
            "action": async ({ run, thread }: any, _: State) => {
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
            action: async ({ run }: any, { thread }: State) => {
                try {
                    await this.callAPI('runs', 'cancel', { thread_id: thread.id, run_id: run.id });
                } catch (error: any) { console.error('failed to cancel run: ' + error); }
            },
            nextState: null
        },
        "run-failed": {
            action: async ({ run }: any, _: State) => {
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
            action: async ({ run }: any, { thread }: State) => {
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
                            this.state.toolcallmap[tool_call.id] = tool_call;
                        }
                    }
                    this.setState({
                        toolcallmap: this.state.toolcallmap,
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
            action: async (data: any, state: State) => {
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
    setupActionHandlers() {
        Object.entries(this.actionHandlers).forEach(([handlerName, handler]: any) => {
            this.setupActionHandler(handlerName, handler.action, handler.nextState);
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

    async listFiles() {
        return this.callAPI('files', 'list', { thread_id: this.state.thread_id });
    }

    async detachFile(fileId: any) {
        return this.callAPI('files', 'delete', { thread_id: this.state.thread_id, file_id: fileId });
    }

    createAssistant = async (name: string, model: string, apiKey: string) => {
        const assistant = await this.callAPI('assistants', 'create', {
            body: {
                instructions: this.prompt,
                model: model,
                name: name,
                tools: this.getTools().schemas
            }
        });
        this.apiKey = apiKey;
        return assistant;
    }
}