require('dotenv').config();

import { generateUsername } from "unique-username-generator";
import readline from 'readline';
import { configManager } from './config-manager';
const highlight = require('cli-highlight').highlight;

const loadConfig = () => configManager.getConfig();

import path from 'path';
import _AssistantAPI from './assistant';

const se: any = {
    'process-user-input': {
        'action': 'Add',
        'emoji': '🖊️' // Pen for adding new inputs
    },
    'start-run': {
        'action': 'Start',
        'emoji': '🚀' // Rocket for initiating or starting something
    },
    'update-run': {
        'action': 'Update/Refresh/Sync',
        'emoji': '🔄' // The existing refresh emoji is quite apt, but it stays for consistency
    },
    'cancel-run': {
        'action': 'Stop/Pause',
        'emoji': '🛑' // Stop sign for a clearer stop/pause action
    },
    'complete-run': {
        'action': 'Complete/Finish',
        'emoji': '🎉' // Party popper for celebrating completion
    },
    'incomplete-run': {
        'action': 'Incomplete/Unfinish',
        'emoji': '⚠️' // Warning sign to indicate something is incomplete or unfinished
    },
    'handle-run-action-required': {
        'action': 'Accept/Approve/Confirm',
        'emoji': '✔️' // Check mark for acceptance or approval
    },
    "show-message": {
        "action": "Read/View",
        "emoji": "👀" // Eyes for viewing or reading messages
    },
    "session-complete": {
        "action": "Complete/Finish",
        "emoji": "🏁" // Checkered flag for marking completion
    },
    submit_tool_outputs: {
        "action: ": "Submit",
        "emoji": "📤" // Outbox tray for submitting tool outputs
    },
    "assistant-input": {
        "action": "Add",
        "emoji": "✍️" // Writing hand for adding input
    },
    'runs-create': {
        'action': 'Create',
        'emoji': '🌟' // Sparkles for creation, indicating something new and shiny
    },
    'runs-queued': {
        'action': 'List/Display',
        'emoji': '🔍' // Magnifying glass for looking at a list or display
    },
    'cancel-active-run': {
        'action': 'Stop/Pause',
        'emoji': '✋' // Raised hand as a stop gesture
    },
    'run-expired': {
        'action': 'Stop/Pause',
        'emoji': '🕰️' // An old clock to indicate expiration or timeout
    },
    'run-requires-action': {
        'action': 'Accept/Approve/Confirm',
        'emoji': '📬' // Mailbox with flag up to indicate action is needed, like receiving mail
    },
    "idle": {
        "action": "Start",
        "emoji": "💤" // Zzz for idle, indicating readiness to wake up and start
    },
}


class AssistantCLI extends _AssistantAPI {
    rl: any;
    configManager: any;
    state: any;
    constructor(serverUrl = 'https://api.openai.com/v1/') {
        super(serverUrl);
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        })
        .on('close', this.onClose.bind(this))
        .on('line', this.onLine.bind(this));

        this.configManager = configManager;
        this.name = generateUsername("", 2, 38);
        
        const filesSchemas = [
            { "type": 'function', "function": { "name": 'get_file_tree', "description": 'Return a tree of files and folders `n` levels deep from the specified `path`.', "parameters": { "type": 'object', "properties": { "value": { "type": 'string', "description": 'The directory path from which to start the exploration.' }, n: { "type": 'number', "description": 'The depth of exploration.' } }, "required": ['path', 'n'] } } },
            { "type": "function", "function": {"name": "file", "description": "Read, write, modify, and delete a file on the system. Supported operations are read, write, append, prepend, replace, insert_at, remove, delete, and copy.", "parameters": {"type": "object", "properties": {"operation": {"type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, copy, attach, list_attached, detach."}, "path": {"type": "string", "description": "The path to the file to perform the operation on."}, "match": {"type": "string", "description": "The string to match in the file. Regular expressions are supported."}, "data": {"type": "string", "description": "The data to write to the file."}, "position": {"type": "number", "description": "The position at which to perform the operation."}, "target": {"type": "string", "description": "The path to the target file."}}, "required": ["operation", "path"]}}},
            { "type": "function", "function": {"name": "files", "description": "Perform batch operations on files", "parameters": {"type": "object", "properties": {"operations": {"type": "array", "description": "The operations to perform on the files.", "items": {"type": "object", "properties": {"operation": {"type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, and copy."}, "path": {"type": "string", "description": "The path to the file to perform the operation on."}, "match": {"type": "string", "description": "The string to match in the file. Regular expressions are supported."}, "data": {"type": "string", "description": "The data to write to the file."}, "position": {"type": "number", "description": "The position at which to perform the operation."}, "target": {"type": "string", "description": "The path to the target file."}}, "required": ["operation", "path"]}}}, "required": ["operations"]}}},
        ];
        this.actionHandlers = { ...this.actionHandlers, ...this.handlers };
        this.schemas = [...filesSchemas, ...this.schemas];

        this.setupActionHandlers();

        this.loadTools(__dirname); 

        // set the assistant's api key
        const config = configManager.getConfig();
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    }
    async onLine(line: string) {
        this.callSync('send-message', { message: line, thread: this.state.thread });
    }
    async onClose() { 
        const curThread = this.state.thread;
        if(!curThread) {
            process.exit(0);
        }
        let runs = await this.callAPI('runs', 'list', { thread_id: curThread.id });
        runs = runs.data.map((run: any) => {
            if(run.status === 'active' || run.status === 'requires_action') {
                return run;
            } else {
                return null;
            }   
        })
        .filter((run: any) => run);
        if(runs && runs.length > 0) {
            await Promise.all(runs.map(async (run: any) => {
                if(run.status === 'active' || run.status === 'requires_action') {
                    await this.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                }
            }));
            console.log(`Cancelled ${runs.length} active runs`);
        }
        if(runs.length > 0) {
            return;
        } else {
            console.log('Goodbye!');
            process.exit(0);
        }
    }
    beforeAction = (action: string, data: any, state: any) => {
        const out = se[action] ? se[action].emoji : '';
        if(out && action !== 'runs retrieve') {
            process.stdout.write('\n');
        }
        if(out) process.stdout.write(out);
    }
    afterAction = async (action: string, data: any, state: any) => {

    }
    addTool(tool: any, schema: any, state: any): void {
        const toolName: string = tool.name || '';
        this.actionHandlers[toolName] = tool;
        this.schemas.push(schema);
        this.state = { ...this.state, ...state };
        (this as any)[toolName] = tool.bind(this);
    }
    getTool(tool: string | number): any {
        const schema = this.schemas.find((schema: { function: { name: any; }; }) => schema.function.name === tool);
        return {
            [tool]: this.actionHandlers[tool],
            schema
        }
    }
    loadTools(appDir: any) {
        const fs = require('fs');
        const toolsFolder = path.join(appDir, '..', 'tools')
        const toolNames: string[] = [];
        if (fs.existsSync(toolsFolder)) {
            const files = fs.readdirSync(toolsFolder);
            files.forEach((file: any) => {
                const t = require(path.join(toolsFolder, file))
                Object.keys(t.tools).forEach((key: string) => {
                    const toolFunc = t.tools[key];
                    const schema = t.schemas.find((schema: { function: { name: string; }; }) => schema.function.name === key);
                    this.addTool(toolFunc, schema, t.state);
                    console.log(`Tool ${key} loaded`);
                })
            });
        } else {
            console.log('No tools found in the tools folder');
        }
    }

    handlers = {
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
        "run-completed": {
            action: async ({ run, percent_complete: pc2 }: any, {requirements,  tasks, threads, percent_complete }: any) => {
                
                const messages: any = await this.callAPI('messages', 'list', { thread_id: run.thread_id });
                let latest_message = messages.data ? messages.data[0].content[0] : { text: { value: '' } };
                if (latest_message && latest_message.text) {
                    latest_message = latest_message.text.value;
                    latest_message = latest_message.replace(/\\n/g, '');
                    threads[run.thread_id].latest_message = latest_message;
                    this.setState({  threads });
                    this.emit('show-message', { message: latest_message });
                }
                console.log(highlight(latest_message, {language: 'markdown', ignoreIllegals: true}))
                if (percent_complete < 100 && requirements.length > 0) {
                    const action: any = {
                        requirements,
                        percent_complete: percent_complete + 1,
                        chat: 'Lets continue with the next task.'
                    }
                    this.emit('assistant-input', action);
                } else {
                    this.emit('session-complete', { run, latest_message });
                }
            },
            nextState: null
        },
        "session-start": {
            action: async ({ assistant, thread, run }: any, {  }: any) => {
                const config = configManager.loadConfig();
                config.assistant_id = assistant.id;
                config.thread_id = thread && thread.id;
                config.run_id = run && run.id;
                configManager.saveConfig(config);
                console.log(`Session started with assistant ${assistant.id}${thread?', thread '+thread.id:''}}`);
                this.rl.prompt();
            },
            nextState: null
        },
        "session-init": {
            action: async ({}: any, { assistant, thread }: any) => {
                const config = loadConfig();
                this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
                const { schemas } = this.getTools(); 
                // assistant
                if (config.assistant_id) {
                    try { 
                        assistant = await this.callAPI('assistants', 'retrieve', { assistant_id: config.assistant_id });
                    } catch(e) {
                        console.log('Assistant not found. Creating a new assistant.');
                        assistant = await this.callAPI('assistants', 'create', {
                            body: {
                                instructions: this.prompt,
                                model: this.model,
                                name: this.name,
                                tools: schemas
                            }
                        });
                    }
                } else {
                    try {
                        assistant = await this.callAPI('assistants', 'create', {
                            body: {
                                instructions: this.prompt,
                                model: this.model,
                                name: this.name,
                                tools: schemas
                            }
                        });
                    } catch(e) {
                        console.log('could not create assistant. Please check your API key and try again.')
                        process.exit(1);
                    }
                }
                this.setState({
                    assistants: {  [assistant.id]: assistant  },
                    assistant
                })

                // thread
                if(config.thread_id) {
                    thread = await this.callAPI('threads', 'retrieve', { thread_id: config.thread_id });
                } else {
                    thread = await this.callAPI('threads', 'create', { body: { } });
                }

                // run
                if(config.run_id) {
                    const run = await this.callAPI('runs', 'retrieve', { thread_id: thread.id, run_id: config.run_id });
                    // if the run is active, we keep the run in the state and we queue it
                    if(run.status === 'active' || run.status === 'requires_action') {
                        this.setState({ run });
                        this.emit('runs-queue', { run });
                    } else {
                        // if the run is expsired, we cancel it
                        await this.callSync('runs-cancel', { run });   
                    }
                }
            
                this.setState({ 
                    assistants: { [assistant.id]: assistant },
                    assistant,
                    threads: { [thread.id]: { thread, runs: {} } },
                    thread
                 });
                const sessionInfo = {
                    assistant: this.state.assistant,
                    thread: this.state.thread,
                    run: this.state.run ? this.state.run : null
                }
                await this.callSync('session-start', sessionInfo);
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
                this.emit('thread-create', { });
            },
            nextState: null
        },
        "send-message": {
            action: async ({ message, thread }: any, { assistant, run, requirements, percent_complete = 0, status = 'in progress', tasks = [], current_task = '', chat = '' }: any) => {
                const inputFrame = {
                    requirements: requirements ? requirements : message,
                    percent_complete,
                    status,
                    tasks,
                    current_task,
                    chat: requirements ? message : ''
                }
                if(!thread) {
                    thread = await this.callAPI('threads', 'create', {
                        body: { }
                    });
                }
                // cancel any active runs
                let runs = await this.callAPI('runs', 'list', { thread_id: thread.id });
                if(runs.data.length > 0) {
                    await Promise.all(runs.data.map(async (run: any) => {
                        if(run.status === 'active' || run.status === 'requires_action') {
                            await this.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                        }
                    }));
                }
                // create a new message and run
                await this.callAPI('messages', 'create', {
                    thread_id: thread.id,
                    body: { role: 'user', content: JSON.stringify(inputFrame) }
                });
                run = await this.callAPI('runs', 'create', {
                    thread_id: thread.id,
                    body: { assistant_id: assistant.id }
                });
                this.setState({ 
                    threads: { [thread.id]: { thread, runs: { [run.id]: run }, run } },
                    thread,
                    runs: { [run.id]: run },
                    run
                });
                this.callSync('run-queued', { run });
            },
            nextState: null
        },
        "run-cancel": {
            action: async ({ run }: any, state: any) => {
                if(run.status === 'active' || run.status === 'requires_action') {
                    await this.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                }
                console.log(`Run ${run.id} cancelled`);
            },
            nextState: null
        },
        "runs-retrieve": {
            action: async ({ thread_id }: any, state: any) => {
                process.stdout.write(se['runs-queued'].emoji);
            },
            nextState: null
        },
        "update-config": {
            action: async (data: any, { assistant, thread, run, requirements, percent_complete, status, tasks, current_task }: any) => {
                const config = configManager.loadConfig();
                config.current_job = {
                    assistant_id: assistant.id,
                    thread_id: thread.id,
                    run_id: run.id,
                    requirements,
                    percent_complete,
                    status,
                    tasks,
                    current_task
                }
                config.assistant_id = assistant.id;
                config.thread_id = thread.id;
                config.run_id = run.id;
                configManager.saveConfig(config);
            },
            nextState: null
        },
        "file": {
            action:  async function ({ operation, path, match, data, position, target }: any, state: any) {
                const fs = require('fs');
                const pathModule = require('path');
                const cwd = process.cwd();
                try {
                    const p = pathModule.join(cwd, (path || ''));
                    const t = pathModule.join(cwd, (target || ''));
                    if (!fs.existsSync(p || t)) {
                        return `Error: File not found at path ${p || t}`;
                    }
                    let text = fs.readFileSync(p, 'utf8');
                    switch (operation) {
                        case 'read':
                            return text;
                        case 'write':
                            text += data;
                            break;
                        case 'append':
                            text += data;
                            break;
                        case 'prepend':
                            text = data + text;
                            break;
                        case 'replace':
                            text = text.replace(match, data);
                            break;
                        case 'insert_at':
                            text = text.slice(0, position) + data + text.slice(position);
                            break;
                        case 'remove':
                            text = text.replace(match, '');
                            break;
                        case 'delete':
                            fs.unlinkSync(p);
                            break;
                        case 'copy':
                            fs.copyFileSync(p, t);
                            break;
                        case 'attach':
                            await (async({ path }, state) => {
                                path = pathModule.join(__dirname, '..', (path || ''));
                                const extension = path.split('.').pop();
                                if (!fs.existsSync(path)) {
                                    return `Error: File ${path} does not exist`;
                                }
                                try {
                                    const supportedFormats = ['c', 'cpp', 'csv', 'docx', 'html', 'java', 'json', 'md', 'pdf', 'php', 'pptx', 'py', 'rb', 'tex', 'txt', 'css', 'jpeg', 'jpg', 'js', 'gif', 'png', 'tar', 'ts', 'xlsx', 'xml', 'zip'];
                                    if (!extension || !supportedFormats.includes(extension)) {
                                        return `Error: File ${path} has an unsupported format`;
                                    }
                                    const ret = await assistant.attachFile(path);
                                    return ret && `Successfully attached file ${path} to assistant ${assistant.name}` || `Error attaching file ${path} to assistant ${assistant.name}`;
                                } catch (err: any) {
                                    return `Error attaching file ${path} to assistant ${assistant.name}: ${err.message}`
                                }
                            })({ path }, assistant);
                            break;
                        case 'list_attached':
                            await(async(_dummy, assistant) => {
                                try {
                                    if (!assistant) {
                                        return `Error: Could not create assistant`;
                                    }
                                    const myAssistantFiles = await assistant.listFiles();
                                    return JSON.stringify(myAssistantFiles);
                                } catch (err: any) {
                                    return `Error: ${err.message}`
                                }
                            })(null, assistant);
                            break;
                        case 'detach':
                            await(async({ path }, assistant) => {
                                path = pathModule.join(__dirname, '..', (path || ''));
                                if (!fs.existsSync(path)) {
                                    return `Error: File ${path} does not exist`;
                                }
                                try {
                                    const ret = await assistant.detachFile(path);
                                    return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                                } catch (err: any) {
                                    return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`
                                }
                            })({ path }, assistant);
                            break;
                        default:
                            return `Error: Unsupported operation ${operation}`;
                    }
                    fs.writeFileSync(p, text);
                    return `Successfully executed ${operation} operation on file at path ${p}`;
                } catch (error: any) {
                    return `Error: ${error.message}`
                }
            },
            nextState: null
        },
        "files": {
            action: async function ({ operations }: any, run: any) {
                try {
                    const fs = require('fs');
                    const pathModule = require('path');
                    const cwd = process.cwd();
                    for (const { operation, path, match, data, position, target } of operations) {
                        const p = pathModule.join(cwd, (path || ''));
                        const t = pathModule.join(cwd, (target || ''));
                        if (!fs.existsSync(p || t)) {
                            return `Error: File not found at path ${p || t}`;
                        }
                        let text = fs.readFileSync(p, 'utf8');
                        switch (operation) {
                            case 'read':
                                return text;
                            case 'append':
                                text += data;
                                break;
                            case 'prepend':
                                text = data + text;
                                break;
                            case 'replace':
                                text = text.replace(match, data);
                                break;
                            case 'insert_at':
                                text = text.slice(0, position) + data + text.slice(position);
                                break;
                            case 'remove':
                                text = text.replace(match, '');
                                break;
                            case 'delete':
                                fs.unlinkSync(p);
                                break;
                            case 'copy':
                                fs.copyFileSync(p, t);
                                break;
                            case 'attach':
                                await (async({ path }, assistant) => {
                                    path = pathModule.join(__dirname, '..', (path || ''));
                                    const extension = path.split('.').pop();
                                    if (!fs.existsSync(path)) {
                                        return `Error: File ${path} does not exist`;
                                    }
                                    try {
                                        const supportedFormats = ['c', 'cpp', 'csv', 'docx', 'html', 'java', 'json', 'md', 'pdf', 'php', 'pptx', 'py', 'rb', 'tex', 'txt', 'css', 'jpeg', 'jpg', 'js', 'gif', 'png', 'tar', 'ts', 'xlsx', 'xml', 'zip'];
                                        if (!extension || !supportedFormats.includes(extension)) {
                                            return `Error: File ${path} has an unsupported format`;
                                        }
                                        const ret = await assistant.attachFile(path);
                                        return ret && `Successfully attached file ${path} to assistant ${assistant.name}` || `Error attaching file ${path} to assistant ${assistant.name}`;
                                    } catch (err: any) {
                                        return `Error attaching file ${path} to assistant ${assistant.name}: ${err.message}`
                                    }
                                })({ path }, assistant);
                                break;
                            case 'list_attached':
                                await(async(_dummy, assistant) => {
                                    try {
                                        if (!assistant) {
                                            return `Error: Could not create assistant`;
                                        }
                                        const myAssistantFiles = await assistant.listFiles();
                                        return JSON.stringify(myAssistantFiles);
                                    } catch (err: any) {
                                        return `Error: ${err.message}`
                                    }
                                })(null, assistant);
                                break;
                            case 'detach':
                                await(async({ path }, assistant) => {
                                    path = pathModule.join(__dirname, '..', (path || ''));
                                    if (!fs.existsSync(path)) {
                                        return `Error: File ${path} does not exist`;
                                    }
                                    try {
                                        const ret = await assistant.detachFile(path);
                                        return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                                    } catch (err: any) {
                                        return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`
                                    }
                                })({ path }, assistant);
                                break;
                            default:
                                return `Error: Unsupported operation ${operation}`;
                        }
                        fs.writeFileSync(p, text);
                    }
                    return `Successfully executed batch operations on files`;
                } catch (error: any) {
                    return `Error: ${error.message}`
                }
            },
            nextState: null
        },
        "get_file_tree" : {
            action: async ({ value, n }: any, state: any) => {
                const fs = require('fs');
                const pathModule = require('path');
                const cwd = process.cwd();
                const explore = (dir: any, depth: any) => {
                    dir = pathModule.join(cwd, (dir || ''))
                    if (depth < 0) return null;
                    const directoryTree: any = { path: dir, children: [] };
                    try{
                        const fsd = fs.readdirSync(dir, { withFileTypes: true })
                        fsd.forEach((dirent: any) => {
                            const fullPath = pathModule.join(dir, dirent.name); // Use pathModule instead of path
                            // ignore node_modules and .git directories
                            if (dirent.isDirectory() && (dirent.name === 'node_modules' || dirent.name === '.git')) return;
                            if (dirent.isDirectory()) {
                                directoryTree.children.push(explore(fullPath, depth - 1));
                            } else {
                                directoryTree.children.push({ path: fullPath });
                            }
                        });
                    } catch (e: any) { 
                        return e.message;
                    }
                    return directoryTree;
                };
                return explore(value, n);
            } ,
            nextState: null
        }
    }
}

const assistant = new AssistantCLI();
assistant.emit('session-init', {});