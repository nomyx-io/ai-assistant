"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const eventemitter3_1 = require("eventemitter3");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class AssistantAPI extends eventemitter3_1.EventEmitter {
    constructor(serverUrl = 'https://api.openai.com/v1/') {
        super();
        this.debug = false;
        this.actionHandlers = {
            state: {
                action: this._state,
                nextState: null
            },
            states: {
                action: async ({ values }, state) => {
                    for (const name in values) {
                        state[name] = values[name];
                    }
                    return JSON.stringify(state);
                },
                nextState: null
            },
            selectors: {
                action: async ({ values }, state) => {
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
                action: async ({ selector, value }, state) => {
                    function extractBody(str) {
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
                            }
                            else {
                                return 'selector not found. Target "" to target the entire page';
                            }
                        }
                    }
                    catch (error) {
                        return error.message;
                    }
                },
                nextState: null
            },
            setTasks: {
                action: async ({ tasks }, state) => {
                    state.tasks = tasks;
                    state.current_task = tasks[0];
                    state.percent_complete = 0;
                    state.percent_per_task = 100 / tasks.length;
                    return JSON.stringify(state.tasks);
                },
                nextState: null
            },
            advance_task: {
                action: async (_, state) => {
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
            "show-message": {
                action: async ({ message }, state) => {
                    console.log(message);
                },
                nextState: null
            },
            "session-complete": {
                action: async (data, { assistant, thread, run, requirements }) => {
                    if (run && run.status === 'active' || run && run.status === 'requires_action') {
                        await this.callAPI('runs', 'cancel', { thread_id: thread.id, run_id: run.id });
                    }
                    console.log('session complete');
                },
                nextState: null
            },
            "assistant-input": {
                action: async (data, { assistant, thread, run, requirements }) => {
                    if (data instanceof String) {
                        data = {
                            requirements: requirements ? [...requirements, data] : [data],
                            chat: data
                        };
                    }
                    if (!assistant) {
                        assistant = await this.callAPI('assistants', 'create', {
                            body: {
                                instructions: self.prompt,
                                model: this.model,
                                name: this.name,
                                tools: this.schemas
                            }
                        });
                        this.setState({ assistant });
                    }
                    if (!thread) {
                        thread = await this.callAPI('threads', 'create', {
                            assistant_id: assistant.id,
                            body: {
                                messages: [{
                                        role: 'user',
                                        content: data instanceof String ? data : JSON.stringify(data)
                                    }]
                            }
                        });
                        this.setState({ thread });
                    }
                    if (!run) {
                        const runs = await this.callAPI('runs', 'list', { thread_id: thread.id });
                        if (runs.length > 0) {
                            await Promise.all(runs.map(async (_run) => {
                                if (_run.status === 'active' || _run.status === 'requires_action') {
                                    await this.callAPI('runs', 'cancel', { thread_id: thread.id, run_id: _run.id });
                                }
                            }));
                        }
                    }
                    else {
                        if (run.status === 'active' || run.status === 'requires_action') {
                            await this.callAPI('runs', 'cancel', { thread_id: thread.id, run_id: run.id });
                        }
                    }
                    // create a new message
                    await this.callAPI('messages', 'create', {
                        thread_id: thread.id,
                        body: {
                            role: 'user',
                            content: data
                        }
                    });
                    // create a new run
                    run = await this.callAPI('runs', 'create', {
                        thread_id: thread.id,
                        body: {
                            assistant_id: assistant.id
                        }
                    });
                    this.setState({ run });
                    this.emit('run-queued', {
                        run,
                        thread,
                    });
                },
                nextState: null
            },
            "runs-create": {
                action: async ({ run }, state) => {
                }, nextState: null
            },
            "run-queued": {
                "action": async ({ run, thread }, _) => {
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
                        run = await this.callAPI('runs', 'retrieve', { thread_id: run.thread_id, run_id: run.id }, 1000);
                        this.emit('run-queued', { run, thread });
                    }
                },
                "nextState": null
            },
            "cancel-active-run": {
                action: async ({ run }, { thread }) => {
                    try {
                        await this.callAPI('runs', 'cancel', { thread_id: thread.id, run_id: run.id });
                    }
                    catch (error) {
                    }
                },
                nextState: null
            },
            "run-expired": {
                action: async ({ run }, { thread, requirements, percent_complete, current_task, tasks }) => {
                    this.emit('session-complete', { run });
                },
                nextState: null
            },
            "run-completed": {
                action: async ({ run, percent_complete: pc2 }, { threads, thread, percent_complete, requirements, status, tasks, current_task, chat }) => {
                    const messages = await this.callAPI('messages', 'list', { thread_id: run.thread_id });
                    let latest_message = messages.data ? messages.data[0].content[0] : { text: { value: '' } };
                    if (latest_message && latest_message.text) {
                        latest_message = latest_message.text.value;
                        latest_message = latest_message.replace(/\\n/g, '');
                        threads[run.thread_id].latest_message = latest_message;
                        this.setState({
                            threads
                        });
                        this.emit('show-message', { message: latest_message });
                    }
                    this.setState({
                        run: null,
                    });
                    if (percent_complete < 100 && tasks.length > 0) {
                        const action = {
                            requirements,
                            status,
                            percent_complete: percent_complete + 1,
                            tasks,
                            current_task,
                            chat,
                        };
                        this.emit('assistant-input', action);
                    }
                    else {
                        this.emit('session-complete', { run });
                    }
                },
                nextState: null
            },
            "run-requires-action": {
                action: async ({ run }, { toolcallmap, toolOutputs }) => {
                    if (run.required_action.type === 'submit_tool_outputs') {
                        let tool_calls = await run.required_action;
                        this.state.toolcallmap = this.state.toolcallmap || {};
                        tool_calls = tool_calls.submit_tool_outputs.tool_calls;
                        const toolOutputs = [];
                        for (const tool_call of tool_calls) {
                            if (this.state.toolcallmap[tool_call.id])
                                continue;
                            let func = this.actionHandlers[tool_call.function.name];
                            if (func) {
                                func = func.action;
                                let result = await this.callTool(tool_call[tool_call.type].name, JSON.parse(tool_call[tool_call.type].arguments));
                                tool_call.output = result || 'undefined';
                                toolOutputs.push({
                                    tool_call_id: tool_call.id,
                                    output: tool_call.output
                                });
                                this.state.toolcallmap[tool_call.id] = tool_call;
                            }
                            else {
                                tool_call.output = `Tool not found: ${tool_call.function.name}`;
                                const availableTools = this.schemas.map((schema) => schema.function.name);
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
                action: async (data, state) => {
                    let assistants = await this.callAPI('assistants', 'list');
                    assistants = assistants.find((assistant) => assistant.name === this.name || assistant.name.toLowerCase().includes(data));
                    if (assistants.length > 0) {
                        const delCount = assistants.length;
                        await Promise.all(assistants.map((assistant) => this.callAPI('assistants', 'delete', { assistant_id: assistant.id })));
                        console.log(`deleted ${delCount} assistants`);
                    }
                },
                nextState: null
            }
        };
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
        this.debug = true;
        this.schemas = [
            { type: 'function', function: { name: 'state', description: 'Get or set a named variable\'s value. Call with no value to get the current value. Call with a value to set the variable', parameters: { type: 'object', properties: { name: { type: 'string', description: 'The variable\'s name. required' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } } },
            { type: 'function', function: { name: 'selector', description: 'Get or set a selector\'s value on the page. Call with blank selector for the entire page. Call with no value to get the current value. Call with a value to set the elements innerHTML', parameters: { type: 'object', properties: { selector: { type: 'string', description: 'The selector to get or set. If not present, the function will return the entire page' }, value: { type: 'string', description: 'The new value to set the selector to. If not present, the function will return the current value' } } } } },
            { type: 'function', function: { name: 'states', description: 'Set multiple state variables at once', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The variables to set', additionalProperties: { type: 'string' } } }, required: ['values'] } } },
            { type: 'function', function: { name: 'selectors', description: 'Set multiple selectors at once', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The selectors to set', additionalProperties: { type: 'string' } } }, required: ['values'] } } },
            { type: 'function', function: { name: 'advance_task', description: 'Advance the current task to the next task' } },
            { type: 'function', function: { name: 'set_tasks', description: 'Set the tasks to the given tasks. Also sets the current task to the first task in the list', parameters: { type: 'object', properties: { tasks: { type: 'array', description: 'The tasks to set', items: { type: 'string' } } }, required: ['tasks'] } } },
            { type: "function", function: { name: "multiAssistant", description: "Spawn multiple assistants (long-running AI processes) in parallel. This is useful for building an html page where each agent handles a different part of the page.", "parameters": { "type": "object", "properties": { "prompts": { "type": "array", "description": "The prompts to spawn", "items": { "type": "object", "properties": { "message": { "type": "string", "description": "The message to send to the assistant" } }, "required": ["message"] } } }, "required": ["agents"] } } }
        ];
        this.serverUrl = serverUrl;
        this.setupActionHandlers();
        this.callAPI = this.callAPI.bind(this);
        if (!globalThis.window) {
            console.log('running in node');
            const filesTool = require('../tools/files');
            filesTool.schemas.forEach((schema, i) => {
                this.addtool(filesTool.tools[schema.function.name], schema);
            });
            const execute = require('../tools/execute');
            execute.schemas.forEach((schema, i) => {
                this.addtool(execute.tools[schema.function.name], schema);
            });
        }
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
    addtool(tool, schema) {
        this.schemas.push(schema);
        this.actionHandlers[tool] = { action: async (data, state) => { }, nextState: null };
        this.setupActionHandler(tool, async (data, state) => { }, null);
    }
    async callTool(tool, data) {
        return this.actionHandlers[tool].action(data, this.state);
    }
    // Improved callAPI method with refined error handling and retry logic
    async callAPI(type, api, params = {}, callDelay = 0, retries = 3, retryDelay = 1000) {
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
                    if (!this.state[type])
                        this.state[type] = {};
                    this.state[type][r.id] = r;
                    this.state[type.slice(0, -1)] = r;
                }
                else
                    this.state[type] = r;
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
                await delay(retryDelay);
                return this.callAPI(type, api, params, retries - 1, 0, retryDelay * 2);
            }
            else {
                this.emit('api-error', { error, type, api });
                throw 'API request failed.n]]n' + JSON.stringify(reqData, null, 2);
            }
        }
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
        };
    }
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.emit('state', this.state);
    }
    getState() { return JSON.parse(JSON.stringify(this.state)); }
    waitThenEmit(event, data, delay = 1000) {
        setTimeout(() => this.emit(event, data), delay);
    }
    setupActionHandler(handlerName, action, nextState, handleType = 'on') {
        this.actionHandlers[handlerName] = { action, nextState };
        try {
            this[handleType](handlerName, async (data) => {
                await action(data, this.state);
                if (this.afterAction)
                    this.afterAction(handlerName, data, this.state);
                if (nextState) {
                    this.emit(nextState, this.state);
                }
            }, this);
        }
        catch (error) {
            console.error(`Error setting up action handler: ${handlerName}`, error);
        }
    }
    removeActionHandler(handlerName) {
        delete this.actionHandlers[handlerName];
        this.removeAllListeners(handlerName);
    }
    _state({ name, value }, state) {
        if (value) {
            state[name] = value;
            return state[name];
        }
        else {
            return state[name];
        }
    }
    setupActionHandlers() {
        Object.entries(this.actionHandlers).forEach(([handlerName, handler]) => {
            this.setupActionHandler(handlerName, handler.action, handler.nextState);
        });
    }
}
exports.default = AssistantAPI;
module.exports = AssistantAPI;
//# sourceMappingURL=assistant.js.map