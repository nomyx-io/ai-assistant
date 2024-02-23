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
require('dotenv').config();
const unique_username_generator_1 = require("unique-username-generator");
const readline_1 = __importDefault(require("readline"));
const config_manager_1 = require("./config-manager");
const highlight = require('cli-highlight').highlight;
const loadConfig = () => config_manager_1.configManager.getConfig();
const emo_1 = __importDefault(require("./emo"));
;
const path_1 = __importDefault(require("path"));
const assistant_1 = __importDefault(require("./assistant"));
function base64_encode(file) {
    if (!globalThis.window) {
        // read binary data
        var bitmap = require('fs').readFileSync(file);
        // convert binary data to base64 encoded string
        return new Buffer(bitmap).toString('base64');
    }
    else { // else this is the web so we use the FileReader API
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = function () {
                var dataUrl = reader.result;
                var base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            reader.readAsDataURL(file);
        });
    }
}
class AssistantCLI extends assistant_1.default {
    constructor(serverUrl = 'https://api.openai.com/v1/') {
        super(serverUrl);
        this.handlers = {
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
                        this.emit('send-message', action);
                    }
                    else {
                        this.emit('session-complete', { run, latest_message });
                    }
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
                    yield this.callSync('session-start', {
                        assistant,
                        thread
                    });
                }),
                nextState: null
            },
            "session-start": {
                action: ({ assistant, thread, run }, {}) => __awaiter(this, void 0, void 0, function* () {
                    const config = config_manager_1.configManager.loadConfig();
                    config.assistant_id = assistant.id;
                    config.thread_id = thread && thread.id;
                    config.run_id = run && run.id;
                    config_manager_1.configManager.saveConfig(config);
                    console.log(`Session started with assistant ${assistant.id}${thread ? ', thread ' + thread.id : ''}}`);
                    this.rl.prompt();
                }),
                nextState: null
            },
            "send-message": {
                action: ({ message, thread }, { run, requirements, percent_complete = 0, status = 'in progress', tasks = [], current_task = '', chat = '' }) => __awaiter(this, void 0, void 0, function* () {
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
                        body: { assistant_id: thread.assistant_id }
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
                    process.stdout.write(emo_1.default['runs-queued'].emoji);
                }),
                nextState: null
            },
            "update-config": {
                action: (data, { assistant, thread, run, requirements, percent_complete, status, tasks, current_task }) => __awaiter(this, void 0, void 0, function* () {
                    const config = config_manager_1.configManager.loadConfig();
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
                    config_manager_1.configManager.saveConfig(config);
                }),
                nextState: null
            },
            selectors: {
                action: ({ values }, state) => __awaiter(this, void 0, void 0, function* () {
                    const results = [];
                    const selectorFunction = this.actionHandlers.selector;
                    for (const selector in values) {
                        results.push(selectorFunction({ selector, value: values[selector] }, state));
                    }
                    return results.join('\n') || 'undefined';
                }),
                nextState: null
            },
            selector: {
                action: ({ selector, value }, state) => __awaiter(this, void 0, void 0, function* () {
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
                }),
                nextState: null
            },
            eval: {
                action: ({ code }, state) => __awaiter(this, void 0, void 0, function* () {
                    function evalInContext(js, context) {
                        return __awaiter(this, void 0, void 0, function* () {
                            return function () { return eval(js); }.call(context);
                        });
                    }
                    try {
                        const results = yield evalInContext(code, globalThis);
                        return results instanceof Object ? JSON.stringify(results) : results;
                    }
                    catch (error) {
                        return error.message;
                    }
                }),
                nextState: null
            },
            get_file_tree: {
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
            },
            image_describe: {
                action: function ({ image_urls, data }, state, assistantAPI) {
                    return __awaiter(this, void 0, void 0, function* () {
                        try {
                            const config = config_manager_1.configManager.getConfig();
                            const OpenAI = require('openai');
                            const openai = new OpenAI({ apiKey: config.openai_api_key, dangerouslyAllowBrowser: true });
                            const chatMsg = {
                                model: "gpt-4-vision-preview",
                                messages: [
                                    {
                                        "role": "user",
                                        "content": [
                                            {
                                                "type": "text",
                                                "text": "Provide a detailed description of each image.",
                                            },
                                        ],
                                    }
                                ],
                                stream: false,
                                max_tokens: 500
                            };
                            const addImageToRequest = (url, detail = "high", base64encode) => {
                                if (base64encode) {
                                    url = base64_encode(url);
                                }
                                const image = {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": url,
                                        "detail": detail
                                    }
                                };
                                chatMsg.messages[0].content.push(image);
                            };
                            for (let i = 0; i < image_urls.length; i++) {
                                addImageToRequest(image_urls[i].url, image_urls[i].detail, image_urls[i].base64encode);
                            }
                            const response = yield openai.chat.completions.create(chatMsg);
                            return response.choices[0].message.content[0].text;
                        }
                        catch (err) {
                            return JSON.stringify(err.message);
                        }
                    });
                },
                nextState: null
            },
            image_generate: {
                action: ({ model = 'dall-e-3', prompt, response_format = 'url', n = 1 }, state, assistantAPI) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const images = yield assistantAPI.callAPI('images', 'generations', {
                            model,
                            prompt,
                            response_format
                        });
                        const result = [];
                        if (!globalThis.window) {
                            const fs = require('fs');
                            for (const image of images.data) {
                                let buffer;
                                image.b64_json && (buffer = Buffer.from(image.b64_json, 'base64'));
                                const cwd = process.cwd();
                                const savePath = `${cwd}/${Date.now()}.png`;
                                buffer && fs.writeFileSync(savePath, buffer);
                                result.push(savePath);
                            }
                        }
                        return result;
                    }
                    catch (err) {
                        return JSON.stringify(err.message);
                    }
                }),
                nextState: null
            },
            say_aloud: {
                action: ({ text, voice }) => __awaiter(this, void 0, void 0, function* () {
                    require('dotenv').config();
                    const PlayHT = require("playht");
                    const fs = require('fs');
                    var player = require('play-sound')({});
                    var config = require('../config');
                    const apiKey = config.PLAYHT_AUTHORIZATION;
                    const userId = config.PLAYHT_USER_ID;
                    const maleVoice = config.PLAYHT_MALE_VOICE;
                    const femaleVoice = config.PLAYHT_FEMALE_VOICE;
                    if (!voice)
                        voice = config.PLAYHT_FEMALE_VOICE;
                    if (!apiKey || !userId || !maleVoice || !femaleVoice) {
                        const missing = [];
                        if (!apiKey)
                            missing.push('playHT.apiKey');
                        if (!userId)
                            missing.push('playHT.userId');
                        if (!maleVoice)
                            missing.push('playHT.maleVoice');
                        if (!femaleVoice)
                            missing.push('playHT.femaleVoice');
                        return `Missing configuration: ${missing.join(', ')} in configuration file. Please ask the user to provide the missing configuration using the ask_for_data tool.`;
                    }
                    // Initialize PlayHT API
                    PlayHT.init({
                        apiKey: apiKey,
                        userId: userId,
                    });
                    function getNonce() {
                        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                    }
                    function speakSentence(sentence, voice) {
                        return __awaiter(this, void 0, void 0, function* () {
                            if (!sentence)
                                return;
                            const stream = yield PlayHT.stream(sentence, {
                                voiceEngine: "PlayHT2.0-turbo",
                                voiceId: voice === 'male' ? maleVoice : femaleVoice,
                            });
                            const chunks = [];
                            stream.on("data", (chunk) => chunks.push(chunk));
                            return new Promise((resolve, reject) => {
                                stream.on("end", () => {
                                    const buf = Buffer.concat(chunks);
                                    // save the audio to a file
                                    const filename = `${getNonce()}.mp3`;
                                    fs.writeFileSync(filename, buf);
                                    player.play(filename, function (err) {
                                        fs.unlinkSync(filename);
                                        resolve(`done`);
                                    });
                                });
                            });
                        });
                    }
                    // split the text into sentences
                    const sentences = text.split(/[.!?]/g).filter((sentence) => sentence.length > 0);
                    const consumeSentence = () => __awaiter(this, void 0, void 0, function* () {
                        return new Promise((resolve, reject) => {
                            const loop = () => __awaiter(this, void 0, void 0, function* () {
                                const sentence = sentences.shift();
                                if (!sentence)
                                    return resolve('done');
                                yield speakSentence(sentence, voice);
                                return yield loop();
                            });
                            return loop();
                        });
                    });
                    yield consumeSentence();
                    return '(aloud) ' + text;
                }),
                nextState: null
            },
            file: {
                action: ({ operation, path, match, data, position, target }, { thread }, assistantAPI) => __awaiter(this, void 0, void 0, function* () {
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
                                        const ret = yield assistantAPI.attachFile(path);
                                        return ret && `Successfully attached file ${path} to assistant ${this.name}` || `Error attaching file ${path} to assistant ${this.name}`;
                                    }
                                    catch (err) {
                                        return `Error attaching file ${path} to assistant ${this.name}: ${err.message}`;
                                    }
                                }))({ path }, this);
                                break;
                            case 'list_attached':
                                yield ((_dummy, assistant) => __awaiter(this, void 0, void 0, function* () {
                                    try {
                                        if (!assistant) {
                                            return `Error: Could not create assistant`;
                                        }
                                        const myAssistantFiles = yield assistantAPI.callAPI('files', 'list', { thread_id: thread.thread_id });
                                        return JSON.stringify(myAssistantFiles);
                                    }
                                    catch (err) {
                                        return `Error: ${err.message}`;
                                    }
                                }))(null, this);
                                break;
                            case 'detach':
                                yield (({ path }, assistant) => __awaiter(this, void 0, void 0, function* () {
                                    path = pathModule.join(__dirname, '..', (path || ''));
                                    if (!fs.existsSync(path)) {
                                        return `Error: File ${path} does not exist`;
                                    }
                                    try {
                                        const ret = yield assistantAPI.callAPI('files', 'delete', { thread_id: thread.id, file_id: path });
                                        return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                                    }
                                    catch (err) {
                                        return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`;
                                    }
                                }))({ path }, this);
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
                }),
                nextState: null
            },
            files: {
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
                                        yield (({ path }, self) => __awaiter(this, void 0, void 0, function* () {
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
                                                const ret = yield self.attachFile(path);
                                                return ret && `Successfully attached file ${path} to assistant ${self.name}` || `Error attaching file ${path} to assistant ${self.name}`;
                                            }
                                            catch (err) {
                                                return `Error attaching file ${path} to assistant ${self.name}: ${err.message}`;
                                            }
                                        }))({ path }, self);
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
                                        }))(null, self);
                                        break;
                                    case 'detach':
                                        yield (({ path }, assistant) => __awaiter(this, void 0, void 0, function* () {
                                            path = pathModule.join(__dirname, '..', (path || ''));
                                            if (!fs.existsSync(path)) {
                                                return `Error: File ${path} does not exist`;
                                            }
                                            try {
                                                const ret = yield assistant.detachFile(path);
                                                return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                                            }
                                            catch (err) {
                                                return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`;
                                            }
                                        }))({ path }, self);
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
        };
        this.schemas = this.schemas.concat([
            { type: 'function', function: { name: 'selector', description: 'Get or set a selector\'s value on the page. Call with blank selector for the entire page. Call with no value to get the current value. Call with a value to set the elements innerHTML', parameters: { type: 'object', properties: { selector: { type: 'string', description: 'The selector to get or set. If not present, the function will return the entire page' }, value: { type: 'string', description: 'The new value to set the selector to. If not present, the function will return the current value' } } } } },
            { type: 'function', function: { name: 'selectors', description: 'Set multiple selectors at once', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The selectors to set', additionalProperties: { type: 'string' } } }, required: ['values'] } } },
            { type: 'function', function: { name: 'eval', description: 'Evaluate the given code and return the result', parameters: { type: 'object', properties: { code: { type: 'string', description: 'The code to evaluate' } }, required: ['code'] } } },
            { type: 'function', function: { name: 'get_file_tree', "description": 'Return a tree of files and folders `n` levels deep from the specified `path`.', "parameters": { "type": 'object', "properties": { "value": { "type": 'string', "description": 'The directory path from which to start the exploration.' }, n: { "type": 'number', "description": 'The depth of exploration.' } }, "required": ['path', 'n'] } } },
            { type: "function", function: { name: "file", "description": "Read, write, modify, and delete a file on the system. Supported operations are read, write, append, prepend, replace, insert_at, remove, delete, and copy.", "parameters": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, copy, attach, list_attached, detach." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } },
            { type: "function", function: { name: "files", "description": "Perform batch operations on files", "parameters": { "type": "object", "properties": { "operations": { "type": "array", "description": "The operations to perform on the files.", "items": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, and copy." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } }, "required": ["operations"] } } },
            { type: "function", function: { name: 'say_aloud', "description": 'say the text using text-to-speech', "parameters": { "type": 'object', "properties": { "text": { "type": 'string', "description": 'the text to say' }, "voice": { "type": 'string', "description": 'the voice to use (can be \'male\' or \'female\'). If not specified, the default female voice will be used' } }, "required": ['text'] } } },
            { type: 'function', function: { name: 'create-images', description: 'Create images from the given prompts', "parameters": { "type": 'object', "properties": { "prompts": { "type": 'array', "description": 'The prompts to generate images from', "items": { "type": 'object', "properties": { "prompt": { "type": 'string', "description": 'The message to send to the assistant' }, "n": { "type": 'integer', "description": 'The number of images to generate. max 1 image per prompt for dall-e-3, max 10 images per prompt for dall-e-2. default is 1' }, "model": { "type": 'string', "description": 'The model to use for generation. either "dall-e-2" or "dall-e-3". default is "dall-e-3"' }, "response": { "type": 'string', "description": 'The response format for the generated images. either "url" or "base64". default is "url"' } }, "required": ['prompt'] } } } } } },
            //    { "type": 'function', "function": { "name": 'image_describe', "description": 'Given one or more images, describe it in text with as much detail as you can. This function can process multiple images simultaneously.', "type": 'object', "properties": { "image_urls": { "type": 'array', "description": 'The URLs of the images to describe', "items": { "type": 'object', "description": 'The image URL and options', "properties": { "url": { "type": 'string', "description": 'The URL or file path of the image to describe. If base64encode is true, this should be a file path.' }, "detail": { "type": 'string', "description": 'The level of detail to include in the description' }, "base64encode": { "type": 'boolean', "description": 'Whether to encode the image as base64 before sending it to the API' } }, "required": ['url'] } }, "required": ['image_urls'] } } }
        ]);
        this.beforeAction = (action, data, state) => {
            const out = emo_1.default[action] ? emo_1.default[action].emoji : '';
            if (out && action !== 'runs retrieve') {
                process.stdout.write('\n');
            }
            if (out)
                process.stdout.write(out);
        };
        this.afterAction = (action, data, state) => __awaiter(this, void 0, void 0, function* () {
        });
        this.rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        })
            .on('close', this.onClose.bind(this))
            .on('line', this.onLine.bind(this));
        this.configManager = config_manager_1.configManager;
        this.name = (0, unique_username_generator_1.generateUsername)("", 2, 38);
        this.actionHandlers = Object.assign(Object.assign({}, this.actionHandlers), this.handlers);
        this.loadTools(__dirname);
        // set the assistant's api key
        const config = config_manager_1.configManager.getConfig();
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    }
    onLine(line) {
        return __awaiter(this, void 0, void 0, function* () {
            this.callSync('send-message', { message: line, thread: this.state.thread });
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            const curThread = this.state.thread;
            if (!curThread) {
                process.exit(0);
            }
            let runs = yield this.callAPI('runs', 'list', { thread_id: curThread.id });
            runs = runs.data.map((run) => {
                if (run.status === 'active' || run.status === 'requires_action') {
                    return run;
                }
                else {
                    return null;
                }
            })
                .filter((run) => run);
            if (runs && runs.length > 0) {
                yield Promise.all(runs.map((run) => __awaiter(this, void 0, void 0, function* () {
                    if (run.status === 'active' || run.status === 'requires_action') {
                        yield this.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                    }
                })));
                console.log(`Cancelled ${runs.length} active runs`);
            }
            if (runs.length > 0) {
                return;
            }
            else {
                console.log('Goodbye!');
                process.exit(0);
            }
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
            [tool]: this.actionHandlers[tool],
            schema
        };
    }
    loadTools(appDir) {
        const fs = require('fs');
        const toolsFolder = path_1.default.join(appDir, '..', 'tools');
        const toolNames = [];
        if (fs.existsSync(toolsFolder)) {
            const files = fs.readdirSync(toolsFolder);
            if (!files) {
                console.warn('No tools found in the tools folder');
                return;
            }
            files.forEach((file) => {
                const t = require(path_1.default.join(toolsFolder, file));
                if (!t.tools) {
                    console.warn('No tools found in the tools folder');
                    return;
                }
                Object.keys(t.tools).forEach((key) => {
                    if (!t.tools) {
                        console.warn(`Tool ${key} not found in tools`);
                        return;
                    }
                    const toolFunc = t.tools[key];
                    const schema = t.schemas.find((schema) => schema.function.name === key);
                    this.addTool(toolFunc, schema, t.state);
                    toolNames.push(key);
                    console.log(`Tool ${key} loaded`);
                });
            });
        }
        else {
            console.log('No tools found in the tools folder');
        }
        return toolNames;
    }
}
const assistant = new AssistantCLI();
assistant.emit('session-init', {});
//# sourceMappingURL=cli.js.map