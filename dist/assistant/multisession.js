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
const assistant_1 = __importDefault(require("./assistant"));
const config_manager_1 = require("./config-manager");
const path_1 = __importDefault(require("path"));
const emo_1 = __importDefault(require("./emo"));
const prompt_1 = __importDefault(require("./prompt"));
const readline = require('readline');
const unique_username_generator_1 = require("unique-username-generator");
const highlight = require('cli-highlight').highlight;
const loadConfig = () => config_manager_1.configManager.getConfig();
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY)
    process.stdin.setRawMode(true);
'';
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
class TerminalSessionManager extends assistant_1.default {
    constructor() {
        super();
        this.prompt = prompt_1.default;
        this.model = 'gpt-4-turbo-preview';
        this.name = 'assistant';
        this.actionHandlers = Object.assign(Object.assign({}, this.actionHandlers), {
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
            // ********** action handlers **********
            "run-completed": {
                action: ({ run, percent_complete: pc2 }, { requirements, tasks, threads, percent_complete }, session) => __awaiter(this, void 0, void 0, function* () {
                    const messages = yield session.manager.callAPI('messages', 'list', { thread_id: run.thread_id });
                    let latest_message = messages.data ? messages.data[0].content[0] : { text: { value: '' } };
                    if (latest_message && latest_message.text) {
                        latest_message = latest_message.text.value;
                        latest_message = latest_message.replace(/\\n/g, '');
                        threads[run.thread_id].latest_message = latest_message;
                        session.manager.setState({ threads });
                        session.manager.emit('show-message', { message: latest_message });
                    }
                    console.log(highlight(latest_message, { language: 'markdown', ignoreIllegals: true }));
                    if (percent_complete < 100 && requirements.length > 0) {
                        const action = {
                            requirements,
                            percent_complete: percent_complete + 1,
                            chat: 'Lets continue with the next task.'
                        };
                        session.manager.emit('assistant-input', action);
                    }
                    else {
                        session.manager.emit('session-complete', { run, latest_message });
                    }
                    this.readlineInterface.prompt();
                }),
                nextState: null
            },
            "session-init": {
                action: ({}, { assistant, run, thread }, session) => __awaiter(this, void 0, void 0, function* () {
                    const config = loadConfig();
                    session.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
                    // thread
                    if (config.thread_id) {
                        thread = yield session.manager.callAPI('threads', 'retrieve', { thread_id: config.thread_id });
                    }
                    else {
                        thread = yield session.manager.callAPI('threads', 'create', { body: {} });
                    }
                    // run
                    if (config.run_id) {
                        const run = yield session.manager.callAPI('runs', 'retrieve', { thread_id: thread.id, run_id: config.run_id });
                        // if the run is active, we keep the run in the state and we queue it
                        if (run.status === 'active' || run.status === 'requires_action') {
                            session.manager.setState({ run });
                            session.manager.emit('runs-queue', { run });
                        }
                        else {
                            yield session.manager.callSync('runs-cancel', { run });
                        }
                    }
                    session.setState({
                        assistants: { [this.assistant.id]: this.assistant },
                        assistant: this.assistant,
                        threads: { [thread.id]: { thread, runs: {} } },
                        thread
                    });
                    const sessionInfo = { assistant, thread, run: null };
                    yield session.callSync('session-start', sessionInfo);
                }),
                nextState: null
            },
            "session-start": {
                action: ({ thread }, { assistant }, session) => __awaiter(this, void 0, void 0, function* () {
                    const config = config_manager_1.configManager.loadConfig();
                    config.assistant_id = assistant.id;
                    config.thread_id = thread && thread.id;
                    config_manager_1.configManager.saveConfig(config);
                    console.log(`Session started with assistant ${assistant.id}${thread ? ', thread ' + thread.id : ''}}`);
                    this.readlineInterface.prompt();
                }),
                nextState: null
            },
            "send-message": {
                action: ({ message, thread }, { assistant, run, requirements, percent_complete = 0, status = 'in progress', tasks = [], current_task = '', chat = '' }, session) => __awaiter(this, void 0, void 0, function* () {
                    const inputFrame = {
                        requirements: requirements ? requirements : message,
                        percent_complete,
                        status,
                        tasks,
                        current_task,
                        chat: requirements ? message : ''
                    };
                    if (!thread) {
                        thread = yield session.manager.callAPI('threads', 'create', {
                            body: {}
                        });
                    }
                    // cancel any active runs
                    let runs = yield session.manager.callAPI('runs', 'list', { thread_id: thread.id });
                    if (runs.data.length > 0) {
                        yield Promise.all(runs.data.map((run) => __awaiter(this, void 0, void 0, function* () {
                            if (run.status === 'active' || run.status === 'requires_action') {
                                yield session.manager.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                            }
                        })));
                    }
                    // create a new message and run
                    yield session.manager.callAPI('messages', 'create', {
                        thread_id: thread.id,
                        body: { role: 'user', content: JSON.stringify(inputFrame) }
                    });
                    run = yield session.manager.callAPI('runs', 'create', {
                        thread_id: thread.id,
                        body: { assistant_id: assistant.id }
                    });
                    session.setState({
                        threads: { [thread.id]: { thread, runs: { [run.id]: run }, run } },
                        thread,
                        runs: { [run.id]: run },
                        run
                    });
                    yield session.manager.callSync('run-queued', { run });
                }),
                nextState: null
            },
            "run-cancel": {
                action: ({ run }, state, session) => __awaiter(this, void 0, void 0, function* () {
                    if (run.status === 'active' || run.status === 'requires_action') {
                        yield session.manager.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                    }
                    console.log(`Run ${run.id} cancelled`);
                }),
                nextState: null
            },
            "runs-retrieve": {
                action: ({ thread_id }, state, session) => __awaiter(this, void 0, void 0, function* () {
                    process.stdout.write(emo_1.default['runs-queued'].emoji);
                }),
                nextState: null
            },
            "update-config": {
                action: (data, { assistant, thread, run, requirements, percent_complete, status, tasks, current_task }, session) => __awaiter(this, void 0, void 0, function* () {
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
                    config.state = this.state;
                    config_manager_1.configManager.saveConfig(config);
                }),
                nextState: null
            },
        });
        this.schemas = [
            { type: 'function', function: { name: 'selector', description: 'Get or set a selector\'s value on the page. Call with blank selector for the entire page. Call with no value to get the current value. Call with a value to set the elements innerHTML', parameters: { type: 'object', properties: { selector: { type: 'string', description: 'The selector to get or set. If not present, the function will return the entire page' }, value: { type: 'string', description: 'The new value to set the selector to. If not present, the function will return the current value' } } } } },
            { type: 'function', function: { name: 'selectors', description: 'Set multiple selectors at once', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The selectors to set', additionalProperties: { type: 'string' } } }, required: ['values'] } } },
            { type: 'function', function: { name: 'eval', description: 'Evaluate the given code and return the result', parameters: { type: 'object', properties: { code: { type: 'string', description: 'The code to evaluate' } }, required: ['code'] } } },
            { type: 'function', function: { name: 'get_file_tree', "description": 'Return a tree of files and folders `n` levels deep from the specified `path`.', "parameters": { "type": 'object', "properties": { "value": { "type": 'string', "description": 'The directory path from which to start the exploration.' }, n: { "type": 'number', "description": 'The depth of exploration.' } }, "required": ['path', 'n'] } } },
            { type: "function", function: { name: "file", "description": "Read, write, modify, and delete a file on the system. Supported operations are read, write, append, prepend, replace, insert_at, remove, delete, and copy.", "parameters": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, copy, attach, list_attached, detach." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } },
            { type: "function", function: { name: "files", "description": "Perform batch operations on files", "parameters": { "type": "object", "properties": { "operations": { "type": "array", "description": "The operations to perform on the files.", "items": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, and copy." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } }, "required": ["operations"] } } },
            { type: "function", function: { name: 'say_aloud', "description": 'say the text using text-to-speech', "parameters": { "type": 'object', "properties": { "text": { "type": 'string', "description": 'the text to say' }, "voice": { "type": 'string', "description": 'the voice to use (can be \'male\' or \'female\'). If not specified, the default female voice will be used' } }, "required": ['text'] } } },
            { type: 'function', function: { name: 'create-images', description: 'Create images from the given prompts', "parameters": { "type": 'object', "properties": { "prompts": { "type": 'array', "description": 'The prompts to generate images from', "items": { "type": 'object', "properties": { "prompt": { "type": 'string', "description": 'The message to send to the assistant' }, "n": { "type": 'integer', "description": 'The number of images to generate. max 1 image per prompt for dall-e-3, max 10 images per prompt for dall-e-2. default is 1' }, "model": { "type": 'string', "description": 'The model to use for generation. either "dall-e-2" or "dall-e-3". default is "dall-e-3"' }, "response": { "type": 'string', "description": 'The response format for the generated images. either "url" or "base64". default is "url"' } }, "required": ['prompt'] } } } } } },
            //{ type: "function", function: { name: "multi_assistant", description: "Spawn multiple assistants (long-running AI processes) in parallel. This is useful for building an html page where each agent handles a different part of the page.", "parameters": { "type": "object", "properties": { "prompts": { "type": "array", "description": "The prompts to spawn", "items": { "type": "object", "properties": { "message": { "type": "string", "description": "The message to send to the assistant" } }, "required": ["message"] } } }, "required": ["agents"] } } },
        ];
        this.state = {
            requirements: 'no requirements set',
            percent_complete: 0,
            status: 'idle',
            tasks: [],
            current_task: '',
            notes: 'no AI notes.',
            chat: 'no chat messages'
        };
        this.beforeAction = (action, data, state) => __awaiter(this, void 0, void 0, function* () {
            const out = emo_1.default[action] ? emo_1.default[action].emoji : '';
            if (out && action !== 'runs retrieve') {
                process.stdout.write('\n');
            }
            if (out)
                process.stdout.write(out);
            // save application state
            const config = config_manager_1.configManager.loadConfig();
            config.state = state;
            config_manager_1.configManager.saveConfig(config);
        });
        this.sessions = [];
        this.activeSessionIndex = 0;
        this.name = (0, unique_username_generator_1.generateUsername)("", 2, 38);
        this.loadTools(__dirname);
        this.initAssistant().then((assistant) => {
            this.initializeReadline();
        });
    }
    initAssistant() {
        return __awaiter(this, void 0, void 0, function* () {
            const { schemas } = this.getTools();
            const config = config_manager_1.configManager.loadConfig();
            if (config.assistant_id) {
                try {
                    this.assistant = yield this.callAPI('assistants', 'retrieve', { assistant_id: config.assistant_id });
                }
                catch (e) {
                    console.log('Assistant not found. Creating a new assistant.');
                    this.assistant = yield this.callAPI('assistants', 'create', {
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
                    this.assistant = yield this.callAPI('assistants', 'create', {
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
            config.assistant_id = this.assistant.id;
            config_manager_1.configManager.saveConfig(config);
            return this.assistant;
        });
    }
    // Initialize the readline interface
    initializeReadline() {
        this.readlineInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        });
        let isCtrlAPressed = false;
        process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'a') {
                isCtrlAPressed = true;
            }
            else if (isCtrlAPressed) {
                if (key.name === 'n') {
                    this.createNewSession(this);
                    isCtrlAPressed = false; // Reset flag after handling
                }
                else if (key.name === 'c') {
                    this.switchToNextSession();
                    isCtrlAPressed = false; // Reset flag after handling
                }
            }
            else {
                isCtrlAPressed = false; // Reset flag if other keys are pressed
            }
        });
        this.readlineInterface.on('line', (line) => {
            this.executeCommandInActiveSession(line);
        }).on('close', () => {
            console.log('Session closed');
            process.exit(0);
        });
        this.createNewSession(this); // Start with one session open
    }
    addTool(tool, schema, state) {
        const toolName = tool.name || '';
        this.actionHandlers[toolName] = tool;
        this.schemas.push(schema);
        this.state = Object.assign(Object.assign({}, this.state), state);
        // (this as any)[toolName] = tool.bind(this);
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
    createNewSession(parent) {
        return __awaiter(this, void 0, void 0, function* () {
            this.sessionManager = parent;
            const newSession = new TerminalSession(this);
            this.sessions.push(newSession);
            this.activeSessionIndex = this.sessions.length - 1;
            this.switchToSession(this.activeSessionIndex);
            if (!this.state.sessions)
                this.state.sessions = {};
            this.state.sessions[newSession.id] = newSession.getState();
            this.state.activeSessionIndex = this.activeSessionIndex;
            this.state.assistant = this.assistant;
            console.clear();
            newSession.setState(this.state.sessions[newSession.id]);
            this.emit('session-init', {
                assistant: this.assistant.id
            });
        });
    }
    switchToNextSession() {
        this.activeSessionIndex = (this.activeSessionIndex + 1) % this.sessions.length;
        this.switchToSession(this.activeSessionIndex);
        // clear the screen
        console.clear();
        console.log('Switched to next session.');
    }
    switchToSession(index) {
        console.log(`Switched to session ${index}.`);
        this.sessions[this.activeSessionIndex].printHistory();
    }
    executeCommandInActiveSession(command) {
        this.sessions[this.activeSessionIndex].executeCommand(command);
    }
}
class TerminalSession {
    constructor(manager) {
        this.manager = manager;
        this.id = '';
        this.state = {
            requirements: 'no requirements set',
            percent_complete: 0,
            status: 'idle',
            tasks: [],
            current_task: '',
            notes: 'no AI notes.',
            chat: 'no chat messages'
        };
        this.actionHandlers = {};
        this.history = [];
        this.state = {
            requirements: 'no requirements set',
            percent_complete: 0,
            status: 'idle',
            tasks: [],
            current_task: '',
            notes: 'no AI notes.',
            chat: 'no chat messages'
        };
        Object.entries(manager.actionHandlers).forEach(([handlerName, handler]) => {
            this.actionHandlers[handlerName] = { action: handler.action, nextState: handler.nextState };
            try {
                this.manager[handler.handleType || 'on'](handlerName, (data) => __awaiter(this, void 0, void 0, function* () {
                    if (manager.assistant.beforeAction)
                        yield manager.assistant.beforeAction(handlerName, data, this.state, this);
                    yield handler.action(data, this.state, this);
                    if (manager.assistant.afterAction)
                        yield manager.assistant.afterAction(handlerName, data, this.state, this);
                    if (handler.nextState) {
                        manager.assistant.emit(handler.nextState, this.state);
                    }
                }), this);
            }
            catch (error) {
                console.error(`Error setting up action handler: ${handlerName}`, error);
            }
        });
    }
    executeCommand(command) {
        this.history.push(command);
        this.manager.emit('send-message', {
            message: command,
            thread: this.state.thread
        });
    }
    printHistory() {
        console.log(`Session History [${this.history.length} commands]:`);
        this.history.forEach((command, index) => {
            console.log(`${index + 1}: ${command}`);
        });
    }
    clearHistory() {
        this.history = [];
    }
    setState(newState) {
        this.state = Object.assign(Object.assign({}, this.state), newState);
        this.manager.emit('state', this.state);
    }
    getState() { return JSON.parse(JSON.stringify(this.state)); }
    callSync(handlerName, data) {
        return __awaiter(this, void 0, void 0, function* () { return this.actionHandlers[handlerName].action(data, this.state); });
    }
}
new TerminalSessionManager();
// TODO: Implement dynamic loading of tools and schemas from the ./tools folder
// This will involve scanning the ./tools directory, loading each tool,
// and integrating them into the actionHandlers and schemas.
// TODO: Ensure that each TerminalSession instance correctly utilizes the shared config.json for state management.
// This may require implementing a mechanism to read and write to the config.json
// in a way that supports concurrent access by multiple TerminalSession instances.
// TODO: Add comprehensive error handling and validation for TerminalSession configurations.
// This should include validation of tool and schema loading, as well as
// error handling for issues with config.json access and manipulation.
// TODO: Develop unit tests for TerminalSession and TerminalSessionManager functionalities.
// These tests should cover the dynamic loading of tools and schemas, state management,
// and error handling scenarios.
//# sourceMappingURL=multisession.js.map