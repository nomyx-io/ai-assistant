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
require('dotenv').config();
const { generateUsername } = require("unique-username-generator");
const readline = require('readline');
const { configManager } = require('./config-manager');
const highlight = require('cli-highlight').highlight;
const loadConfig = () => configManager.getConfig();
const saveConfig = (config) => configManager.setConfig(config);
const path = require('path');
const _AssistantAPI = require('./assistant');
const se = {
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
};
class AssistantCLI extends _AssistantAPI {
    constructor(serverUrl = 'https://api.openai.com/v1/') {
        super(serverUrl);
        this.handlers = {
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
            "run-completed": {
                action: ({ run, percent_complete: pc2 }, { requirements, tasks, threads, percent_complete }) => __awaiter(this, void 0, void 0, function* () {
                    const messages = yield this.callAPI('messages', 'list', { thread_id: run.thread_id });
                    let latest_message = messages.data ? messages.data[0].content[0] : { text: { value: '' } };
                    if (latest_message && latest_message.text) {
                        latest_message = latest_message.text.value;
                        latest_message = latest_message.replace(/\\n/g, '');
                        threads[run.thread_id].latest_message = latest_message;
                        this.setState({ threads });
                        this.emit('show-message', { message: latest_message });
                    }
                    console.log(highlight(latest_message, { language: 'markdown', ignoreIllegals: true }));
                    if (percent_complete < 100 && requirements.length > 0) {
                        const action = {
                            requirements,
                            percent_complete: percent_complete + 1,
                            chat: 'Lets continue with the next task.'
                        };
                        this.emit('assistant-input', action);
                    }
                    else {
                        this.emit('session-complete', { run, latest_message });
                    }
                }),
                nextState: null
            },
            "session-start": {
                action: ({ assistant, thread, run }, {}) => __awaiter(this, void 0, void 0, function* () {
                    const config = configManager.loadConfig();
                    config.assistant_id = assistant.id;
                    config.thread_id = thread && thread.id;
                    config.run_id = run && run.id;
                    configManager.saveConfig(config);
                    console.log(`Session started with assistant ${assistant.id}${thread ? ', thread ' + thread.id : ''}}`);
                    this.rl.prompt();
                }),
                nextState: null
            },
            "session-init": {
                action: ({}, { assistant, thread }) => __awaiter(this, void 0, void 0, function* () {
                    const config = loadConfig();
                    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
                    const { schemas } = this.getTools();
                    // assistant
                    if (config.assistant_id) {
                        try {
                            assistant = yield this.callAPI('assistants', 'retrieve', { assistant_id: config.assistant_id });
                        }
                        catch (e) {
                            console.log('Assistant not found. Creating a new assistant.');
                            assistant = yield this.callAPI('assistants', 'create', {
                                body: {
                                    instructions: this.prompt,
                                    model: this.model,
                                    name: this.name,
                                    tools: schemas
                                }
                            });
                        }
                    }
                    else {
                        try {
                            assistant = yield this.callAPI('assistants', 'create', {
                                body: {
                                    instructions: this.prompt,
                                    model: this.model,
                                    name: this.name,
                                    tools: schemas
                                }
                            });
                        }
                        catch (e) {
                            console.log('could not create assistant. Please check your API key and try again.');
                            process.exit(1);
                        }
                    }
                    this.setState({
                        assistants: { [assistant.id]: assistant },
                        assistant
                    });
                    // thread
                    if (config.thread_id) {
                        thread = yield this.callAPI('threads', 'retrieve', { thread_id: config.thread_id });
                    }
                    else {
                        thread = yield this.callAPI('threads', 'create', { body: {} });
                    }
                    // run
                    if (config.run_id) {
                        const run = yield this.callAPI('runs', 'retrieve', { thread_id: thread.id, run_id: config.run_id });
                        // if the run is active, we keep the run in the state and we queue it
                        if (run.status === 'active' || run.status === 'requires_action') {
                            this.setState({ run });
                            this.emit('runs-queue', { run });
                        }
                        else {
                            // if the run is expsired, we cancel it
                            yield this.callSync('runs-cancel', { run });
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
                    };
                    yield this.callSync('session-start', sessionInfo);
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
            "send-message": {
                action: ({ message, thread }, { assistant, run, requirements, percent_complete = 0, status = 'in progress', tasks = [], current_task = '', chat = '' }) => __awaiter(this, void 0, void 0, function* () {
                    const inputFrame = {
                        requirements: requirements ? requirements : message,
                        percent_complete,
                        status,
                        tasks,
                        current_task,
                        chat: requirements ? message : ''
                    };
                    if (!thread) {
                        thread = yield this.callAPI('threads', 'create', {
                            body: {}
                        });
                    }
                    // cancel any active runs
                    let runs = yield this.callAPI('runs', 'list', { thread_id: thread.id });
                    if (runs.data.length > 0) {
                        yield Promise.all(runs.data.map((run) => __awaiter(this, void 0, void 0, function* () {
                            if (run.status === 'active' || run.status === 'requires_action') {
                                yield this.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                            }
                        })));
                    }
                    // create a new message and run
                    yield this.callAPI('messages', 'create', {
                        thread_id: thread.id,
                        body: { role: 'user', content: JSON.stringify(inputFrame) }
                    });
                    run = yield this.callAPI('runs', 'create', {
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
                }),
                nextState: null
            },
            "run-cancel": {
                action: ({ run }, state) => __awaiter(this, void 0, void 0, function* () {
                    if (run.status === 'active' || run.status === 'requires_action') {
                        yield this.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                    }
                    console.log(`Run ${run.id} cancelled`);
                }),
                nextState: null
            },
            "runs-retrieve": {
                action: ({ thread_id }, state) => __awaiter(this, void 0, void 0, function* () {
                    process.stdout.write(se['runs-queued'].emoji);
                }),
                nextState: null
            },
            "update-config": {
                action: (data, { assistant, thread, run, requirements, percent_complete, status, tasks, current_task }) => __awaiter(this, void 0, void 0, function* () {
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
                    };
                    config.assistant_id = assistant.id;
                    config.thread_id = thread.id;
                    config.run_id = run.id;
                    configManager.saveConfig(config);
                }),
                nextState: null
            },
            "file": {
                action: function ({ operation, path, match, data, position, target }, state) {
                    return __awaiter(this, void 0, void 0, function* () {
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
                                    yield (({ path }, state) => __awaiter(this, void 0, void 0, function* () {
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
                                            const ret = assistant.attachFile(path);
                                            return ret && `Successfully attached file ${path} to assistant ${assistant.name}` || `Error attaching file ${path} to assistant ${assistant.name}`;
                                        }
                                        catch (err) {
                                            return `Error attaching file ${path} to assistant ${assistant.name}: ${err.message}`;
                                        }
                                    }))({ path }, assistant);
                                    break;
                                case 'list_attached':
                                    yield ((_dummy, assistant) => __awaiter(this, void 0, void 0, function* () {
                                        try {
                                            if (!assistant) {
                                                return `Error: Could not create assistant`;
                                            }
                                            const myAssistantFiles = yield assistant.listFiles();
                                            return JSON.stringify(myAssistantFiles);
                                        }
                                        catch (err) {
                                            return `Error: ${err.message}`;
                                        }
                                    }))(null, assistant);
                                    break;
                                case 'detach':
                                    yield (({ path }, assistant) => __awaiter(this, void 0, void 0, function* () {
                                        path = pathModule.join(__dirname, '..', (path || ''));
                                        if (!fs.existsSync(path)) {
                                            return `Error: File ${path} does not exist`;
                                        }
                                        try {
                                            const ret = assistant.detachFile(path);
                                            return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                                        }
                                        catch (err) {
                                            return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`;
                                        }
                                    }))({ path }, assistant);
                                    break;
                                default:
                                    return `Error: Unsupported operation ${operation}`;
                            }
                            fs.writeFileSync(p, text);
                            return `Successfully executed ${operation} operation on file at path ${p}`;
                        }
                        catch (error) {
                            return `Error: ${error.message}`;
                        }
                    });
                },
                nextState: null
            },
            "files": {
                action: function ({ operations }, run) {
                    return __awaiter(this, void 0, void 0, function* () {
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
                                        yield (({ path }, assistant) => __awaiter(this, void 0, void 0, function* () {
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
                                                const ret = assistant.attachFile(path);
                                                return ret && `Successfully attached file ${path} to assistant ${assistant.name}` || `Error attaching file ${path} to assistant ${assistant.name}`;
                                            }
                                            catch (err) {
                                                return `Error attaching file ${path} to assistant ${assistant.name}: ${err.message}`;
                                            }
                                        }))({ path }, assistant);
                                        break;
                                    case 'list_attached':
                                        yield ((_dummy, assistant) => __awaiter(this, void 0, void 0, function* () {
                                            try {
                                                if (!assistant) {
                                                    return `Error: Could not create assistant`;
                                                }
                                                const myAssistantFiles = yield assistant.listFiles();
                                                return JSON.stringify(myAssistantFiles);
                                            }
                                            catch (err) {
                                                return `Error: ${err.message}`;
                                            }
                                        }))(null, assistant);
                                        break;
                                    case 'detach':
                                        yield (({ path }, assistant) => __awaiter(this, void 0, void 0, function* () {
                                            path = pathModule.join(__dirname, '..', (path || ''));
                                            if (!fs.existsSync(path)) {
                                                return `Error: File ${path} does not exist`;
                                            }
                                            try {
                                                const ret = assistant.detachFile(path);
                                                return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                                            }
                                            catch (err) {
                                                return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`;
                                            }
                                        }))({ path }, assistant);
                                        break;
                                    default:
                                        return `Error: Unsupported operation ${operation}`;
                                }
                                fs.writeFileSync(p, text);
                            }
                            return `Successfully executed batch operations on files`;
                        }
                        catch (error) {
                            return `Error: ${error.message}`;
                        }
                    });
                },
                nextState: null
            },
            "get_file_tree": {
                action: ({ value, n }, state) => __awaiter(this, void 0, void 0, function* () {
                    const fs = require('fs');
                    const pathModule = require('path');
                    const cwd = process.cwd();
                    const explore = (dir, depth) => {
                        dir = pathModule.join(cwd, (dir || ''));
                        if (depth < 0)
                            return null;
                        const directoryTree = { path: dir, children: [] };
                        try {
                            const fsd = fs.readdirSync(dir, { withFileTypes: true });
                            fsd.forEach((dirent) => {
                                const fullPath = pathModule.join(dir, dirent.name); // Use pathModule instead of path
                                // ignore node_modules and .git directories
                                if (dirent.isDirectory() && (dirent.name === 'node_modules' || dirent.name === '.git'))
                                    return;
                                if (dirent.isDirectory()) {
                                    directoryTree.children.push(explore(fullPath, depth - 1));
                                }
                                else {
                                    directoryTree.children.push({ path: fullPath });
                                }
                            });
                        }
                        catch (e) {
                            return e.message;
                        }
                        return directoryTree;
                    };
                    return explore(value, n);
                }),
                nextState: null
            }
        };
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
            { "type": "function", "function": { "name": "file", "description": "Read, write, modify, and delete a file on the system. Supported operations are read, write, append, prepend, replace, insert_at, remove, delete, and copy.", "parameters": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, copy, attach, list_attached, detach." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } },
            { "type": "function", "function": { "name": "files", "description": "Perform batch operations on files", "parameters": { "type": "object", "properties": { "operations": { "type": "array", "description": "The operations to perform on the files.", "items": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, and copy." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } }, "required": ["operations"] } } },
        ];
        this.actionHandlers = Object.assign(Object.assign({}, this.actionHandlers), this.handlers);
        this.schemas = [...filesSchemas, ...this.schemas];
        this.setupActionHandlers();
        this.loadTools(__dirname);
        // set the assistant's api key
        const config = loadConfig();
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    }
    onLine(line) {
        return __awaiter(this, void 0, void 0, function* () {
            this.callSync('send-message', { message: line, thread: this.state.thread });
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    beforeAction(action, data, state) {
        return __awaiter(this, void 0, void 0, function* () {
            const out = se[action] ? se[action].emoji : '';
            if (out && action !== 'runs retrieve') {
                process.stdout.write('\n');
            }
            if (out)
                process.stdout.write(out);
        });
    }
    afterAction(action, data, state) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    addTool(tool, schema, state) {
        const toolName = tool.name || '';
        this.actionHandlers[toolName] = tool;
        this.schemas.push(schema);
        this.state = Object.assign(Object.assign({}, this.state), state);
        this[toolName] = tool.bind(this);
    }
    getTool(tool) {
        const schema = this.schemas.find((schema) => schema.function.name === tool);
        return {
            [tool]: this.tools[tool],
            schema
        };
    }
    loadTools(appDir) {
        const fs = require('fs');
        const toolsFolder = path.join(appDir, '..', 'tools');
        const toolNames = [];
        if (fs.existsSync(toolsFolder)) {
            const files = fs.readdirSync(toolsFolder);
            files.forEach((file) => {
                const t = require(path.join(toolsFolder, file));
                Object.keys(t.tools).forEach((key) => {
                    const toolFunc = t.tools[key];
                    const schema = t.schemas.find((schema) => schema.function.name === key);
                    this.addTool(toolFunc, schema, t.state);
                    console.log(`Tool ${key} loaded`);
                });
            });
        }
        else {
            console.log('No tools found in the tools folder');
        }
    }
}
const assistant = new AssistantCLI();
assistant.emit('session-init', {});
//# sourceMappingURL=cli.js.map