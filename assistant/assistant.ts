import "dotenv/config";
import { EventEmitter } from 'events';
import fetch, { Response } from 'node-fetch';
import { URL } from 'url';

export interface State {
    [key: string]: any;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface AssistantState {
    assistant_id?: string;
    thread_id?: string;
    run_id?: string;
    message_id?: string;
    file_id?: string;
    step_id?: string;
    body: any;
}

export default class AssistantAPI extends EventEmitter {
    serverUrl: string | URL | undefined;
    prompt: string = `You are a helpful. highly-skilled assistant enabled with a number of powerful tools.
# Application State
You are enabled with a persistent application state that you can use to store and retrieve information across multiple interactions.
- use the 'state' function to get or set a named variable's value
# Tasks
You can define a list of tasks that you want to accomplish and then advance through them one at a time.
- use the 'set_tasks' function to set the tasks to the given tasks. This will set the current task to the first task in the list as well as set the percent_complete to 0
- use the 'advance_task' function to advance the current task to the next task. This will automatically set the percent_complete to the appropriate value, which you should adjust if necessary. Once you have completed the last task, the percent_complete will be set to 100 and the status will be set to 'complete'
# State Variables
The following state variables are available to you throughout your session:
- 'requirements': the requirements that you are currently working on
- 'current_task': the current task that you are working on
- 'percent_complete': the percentage of the overall requirements that you have completed
- 'status': the status of the current session. This can be 'incomplete', or 'complete'
- 'chat': the latest chat message that you have received or sent
- 'notes': any notes that you have taken during the session
You can add any other state variables that you need to manage your session.
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
  "chat": "the latest chat message that you have received or sent"
}
ALWAYS utput RAW JSON - NO surrounding codeblocks.
`    // state
    state: State = {
        requirements: 'no requirements set',
        percent_complete: 0,
        status: 'idle',
        tasks: [],
        current_task: '',
        notes: 'no AI notes.',
        chat: 'no chat messages'
    };
    setState(newState: State | string) {
        if (typeof newState === 'string') {
            try {
                const oState = newState = JSON.parse(newState);
                this.state = { ...this.state, ...oState };
            } catch (error) { console.error(error); }
        } else {
            this.state = { ...this.state, ...newState };
        }
        this.emit('state-changed', this.state);
    }
    getState(): State { return JSON.parse(JSON.stringify(this.state)); }

    model: string = 'gpt-4-turbo-preview';
    name: string = 'Assistant';
    debug: boolean = true;

    constructor(serverUrl = 'https://api.openai.com/v1/') {
        super();
        this.serverUrl = serverUrl;
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set.');
        }
        this.setupActionHandlers();
        this.callAPI = this.callAPI.bind(this);
    }

    // Improved callAPI method with refined error handling and retry logic
    async callAPI(type: string, api: string, params: { [key: string]: any } = {}, callDelay = 0, retries = 3, retryDelay = 1000): Promise<any> {
        const def: any = this.apisDefinition({
            // Corrected from assistant_.d to assistant_id
            assistant_id: params.assistant_id,
            thread_id: params.thread_id,
            run_id: params.run_id,
            message_id: params.message_id,
            file_id: params.fileId,
            step_id: params.stepId,
            body: params.body
        });
        const func = def[type][api];
        const method = Object.keys(func)[0];
        const path = func[method].join('/');
        const url = new URL(path, this.serverUrl as string | URL);

        try {
            if(this.debug) { console.log(type, api); }
            if(callDelay > 0) { await delay(callDelay); }
            const  reqData = {
                method: method.toUpperCase(),
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer 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`,
                    "OpenAI-Beta": "assistants=v1"
                },
                body: JSON.stringify(params.body)
            }
            const response: Response =  await fetch(url, reqData);
            if (response.ok) {
                const r: any = await response.json();
                if(r.id) {
                    if(!this.state[type])
                        this.state[type] = {};
                    this.state[type][r.id] = r;
                    this.state[type.slice(0, -1)] = r;
                }
                this.emit(`${type}-${api}`, response);
                return r;
            } else {
                console.error(`${response.status}: ${response.statusText}`);
                console.error(`${type}-${api}`, response);
                throw new Error(`${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            if (retries > 0 && [429, 503].includes((error as any).status)) {
                console.warn(`Request failed, retrying after ${retryDelay}ms...`, error);
                await delay(retryDelay);
                return this.callAPI(type, api, params, retries - 1, 0, retryDelay * 2);
            } else {
                this.emit('api-error', { error, type, api });
                throw error;  
            }
        }
    }

    apisDefinition(state: AssistantState) {
        function get(api: any[]) { return { 'get': api } }
        function post(api: any[], body = {}) { return { 'post': api, 'body': body } }
        function put(api: any[], body = {}) { return { 'put': api, 'body': body } }
        function del(api: any[]) { return { 'delete': api } }
        return {
            'assistants': {
                'list': get(['assistants']),
                'create': post(['assistants']),
                'retrieve': get(['assistants', state.assistant_id]),
                'modify': put(['assistants', state.assistant_id], state.body),
                'delete': del(['assistants', state.assistant_id]),
            },
            'threads': {
                'list_messages': get(['threads', state.thread_id, 'messages']),
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
                'create_thread_and_run': post(['threads', 'runs'], state),
                'submit_tool_outputs': post(['threads', state.thread_id, 'runs', state.run_id, 'submit_tool_outputs'], state.body),
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


        }
    }

    waitThenEmit(event: string, data: any, delay: number) {
        setTimeout(() => this.emit(event, data), delay);
    }

    setStatusThenEmit(event: string, data: any, status: string) { 
        this.setState({ 
            run: data ,
            status: status
        });
        this.emit(event, { run: data });
    }

    actionHandlers: any = {
        "runs-create": {
            "action": (data: any, state: State) => this.callAPI('runs', 'retrieve', { 
                thread_id: this.state.thread.id, run_id: state.run.id 
            }), "nextState": null,
        },
        "runs-retrieve": {
            "action": async (data: any, state: State) => {
                this.setState({ run_status: data.status, run: data});
            }, "nextState": null
        },
        "run-queued": {
            "action": async (data: any, state: State) => {
                if (data.status === 'completed') { this.emit('run-completed', { run: data }); }
                else if (data.status === 'failed') this.emit('run-failed', { run: data });
                else if (data.status === 'cancelled') this.emit('run-cancelled', { run: data } );
                else if (data.status === 'requires_action') this.emit('run-requires-action', { run: data } );
                else this.waitThenEmit('run-queued', { run: data }, 1000);
            }, "nextState": null
        },
        "runs-list_run_steps": { 
            "action": async (data: any, state: State) => {
                const retrievePromises = [];
                for (const step of data) {
                    retrievePromises.push(this.callAPI('runs', 'retrieve_step', { 
                        thread_id: this.state.thread.id, 
                        run_id: this.state.run.id, 
                        step_id: step.id 
                    }));
                }
                const results = await Promise.all(retrievePromises);
                const run_steps: any = results.reduce((acc: any, result: any) => {
                    acc[result.id] = result;
                    return acc;
                }, {});
                this.setState({  ...run_steps });
            }, "nextState": null
        },
        "retrieve-latest-message": {
            "action": async (data: any, state: State) => {
                if (state.thread && state.thread.id) {
                    const messages = await this.callAPI('threads', 'list_messages', { thread_id: state.thread.id });
                    let latest_message = messages.data ? messages.data[0].content[0].text.value : '';
                    latest_message = latest_message.replace(/\\n/g, '');
                    this.setState({ latest_message });
                    this.emit('display-message', { message: latest_message });
                } else if (state.run && state.run.id) {
                    const messages = await this.callAPI('runs', 'list_messages', { run_id: state.run.id });
                    let latest_message = messages.data ? messages.data[0].content[0].text.value : '';
                    latest_message = latest_message.replace(/\\n/g, '');
                    this.setState({ latest_message });
                    this.emit('display-message', { message: latest_message });
                }
            },
            "nextState": null
        },
        "display-message": {
            "action": (data: any, state: State) => {
                this.setState({ latest_message: data });
                try {
                    console.log(state.latest_message);
                } catch (error) {
                    
                }
            },
            "nextState": null
        },
        "assistant-input": {
            action: async (data: any, state: State) => {
                const inputFrame = {
                    requirements: data,
                    percent_complete: 0,
                    status: "incomplete",
                    chat: data
                }
                const assistant = await this.callAPI('assistants', 'create', {  body: {
                    instructions: this.prompt,
                    model: this.model,
                    name: this.name,
                    tools: this.schemas
                } });
                const run = await this.callAPI('runs', 'create_thread_and_run', {  body: {
                    assistant_id: assistant.id,
                    thread: {
                        messages: [{ role: 'user', content: JSON.stringify(inputFrame) }]
                    } }
                });
                this.setState({ 
                    assistant,
                    thread: await this.callAPI('threads', 'retrieve', { thread_id: run.thread_id }),
                    run
                })
                this.waitThenEmit('run-loop', { run }, 1000);
            },
            nextState: null
        },
        "run-loop": {
            action: async (data: any, state: State) => {
                state.run = await this.callAPI('runs', 'retrieve', { thread_id: this.state.thread.id, run_id: this.state.run.id }, 1000);
                state[state.run.id] = state.run;
                this.setState(state);
                switch (state.run.status) {
                    case 'completed':
                        this.runActionHandler('run-completed', { run: state.run });
                        break;
                    case 'failed':
                        this.runActionHandler('run-failed', { run: state.run });
                        break;
                    case 'cancelled':
                        this.runActionHandler('run-cancelled', { run: state.run });
                        break;
                    case 'requires_action':
                        this.runActionHandler('run-requires-action', { run: state.run });
                        break;
                    default:
                        this.waitThenEmit('run-loop', { run: state.run }, 1000);
                        break;
                }
            },
            nextState: null
        },
        "run-requires-action": {
            action: async (data: any, state: State) => {
                let tool_calls = await data.run.required_action;
                tool_calls = tool_calls.submit_tool_outputs.tool_calls; 
                if(tool_calls.length > 0) {
                    this.setState({
                        tool_calls,
                        run: data.run,
                        run_id: data.run.id,
                        thread_id: data.run.thread_id
                    });
                    this.runActionHandler('execute-tools', { tool_calls, run: data.run });
                }
            },
            nextState: null
        },
        "execute-tools": {
            action: async (data: any, state: State) => {
                const tool_calls = data.tool_calls;
                const toolOutputs = [];
                for (const tool_call of tool_calls) {
                    const func = this.tools[tool_call[tool_call.type].name];
                    if (func) {
                        const result = await func(
                            JSON.parse(tool_call[tool_call.type].arguments), 
                            state
                        );
                        tool_call.output = result || 'undefined';
                        toolOutputs.push({
                            tool_call_id: tool_call.id,
                            output: tool_call.output
                        });
                    }
                }
                await this.callAPI('runs', 'submit_tool_outputs', {  thread_id: state.thread.id, run_id: state.run.id, body: { 
                    tool_outputs: toolOutputs,
                } })
                this.setState({ tool_calls: [] });
                this.runActionHandler('run-loop', { run: state.run });
            },
            nextState: null
        },
        "run-completed": {
            action: (data: any, state: State) => {
                this.setStatusThenEmit('retrieve-latest-message', { run: data }, 'complete');
            },
            nextState: null
        },
        "run-failed": {
            action: (data: any, state: State) => {
                this.setStatusThenEmit('retrieve-latest-message', { run: data }, 'failed');
            },
            nextState: null
        },
        "run-cancelled": {
            action: (data: any, state: State) => {
                this.setStatusThenEmit('retrieve-latest-message', { run: data }, 'cancelled');
            },
            nextState: null
        },
        "cleanup-old": {
            action: async (data: any, state: State) => {
                let assistants = await this.callAPI('assistants', 'list');
                assistants = assistants.find((assistant: any) => assistant.name === this.name);
                if (assistants.length > 0) {
                    const delCount = assistants.length;
                    await Promise.all(
                        assistants.map(
                            (assistant: any) => this.callAPI('assistants', 'delete', { assistant_id: assistant.id })
                        )
                    );
                    console.log(`deleted ${delCount} assistants`);
                }
            },
            nextState: null
        }
    };

    setupActionHandler(handlerName: string, action: any, nextState: string) {
        this.actionHandlers[handlerName] = { action, nextState };
        this.on(handlerName, async (data: any) => {
            console.log(handlerName);
            await action(data, this.state);
            if (nextState) {
                this.emit(nextState, this.state);
            }
        });
    }

    setupActionHandlers() {
        Object.entries(this.actionHandlers).forEach(([handlerName, handler]: any) => {
            this.setupActionHandler(handlerName, handler.action, handler.nextState);
        });
    }

    async runActionHandler(handlerName: string, data: any) {
        this.emit(handlerName, data);
    }

    tools: any = {
        state: ({ name, value }: any, state: State) => { 
            let out;
            if (!value) {out = state[name] ? state[name] instanceof Object ? JSON.stringify(state[name]) : state[name] : 'undefined'; }
            else { state[name] = value; out = `${name} => ${JSON.stringify(state[name])}`; this.setState(state); }
            return out || 'undefined';
        },
        states: function ({ values }: any, state: State) { 
            const results = [];
            const setStateFunction = this.tools.state;
            for (const name in values) { 
                results.push ( setStateFunction({ name, value: values[name] }, state) )
            }
            return results.join('\n') || 'undefined';
        },
        advance_task: function (_: any, state: State) {
            if (state.tasks.length === 0) { return 'no more tasks' } 
            else { 
                state.tasks.shift(); 
                state.current_task = state.tasks[0]; 
                state.percent_complete += state.percent_per_task;
                console.log('task advanced to:' + state.current_task); 
                return state.current_task;
            }
        },
        set_tasks: function ({ tasks }: any, state: State) {
            state.tasks = tasks; 
            state.current_task = tasks[0]; 
            state.percent_complete = 0;
            state.percent_per_task = 100 / tasks.length;
            return JSON.stringify(state.tasks);
        },
    }
    schemas: any = [
        { type: 'function', function: { name: 'state', description: 'Get or set a named variable\'s value. Call with no value to get the current value. Call with a value to set the variable', parameters: { type: 'object', properties: { name: { type: 'string', description: 'The variable\'s name. required' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } } },
        { type: 'function', function: { name: 'advance_task', description: 'Advance the current task to the next task' } },
        { type: 'function', function: { name: 'set_tasks', description: 'Set the tasks to the given tasks. Also sets the current task to the first task in the list', parameters: { type: 'object', properties: { tasks: { type: 'array', description: 'The tasks to set', items: { type: 'string' } } }, required: ['tasks'] } } },
    ];
}
