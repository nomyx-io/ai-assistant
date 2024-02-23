require('dotenv').config();

import { generateUsername } from "unique-username-generator";
import readline from 'readline';
import { configManager } from './config-manager';
const highlight = require('cli-highlight').highlight;
const loadConfig = () => configManager.getConfig();
import emojis from './emo';;
import path from 'path';
import AssistantAPI from "./assistant";

function base64_encode(file: any) {
    if(!globalThis.window) {
        // read binary data
        var bitmap = require('fs').readFileSync(file);
        // convert binary data to base64 encoded string
        return new Buffer(bitmap).toString('base64');
    } else { // else this is the web so we use the FileReader API
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = function() {
                var dataUrl = reader.result;
                var base64 = (dataUrl as any).split(',')[1];
                resolve(base64);
            };
            reader.readAsDataURL(file);
        });
    }
}

class AssistantCLI extends AssistantAPI {
    rl: any;
    configManager: any;
    state: any;
    actionHandlers: any ={ ...this.actionHandlers, ...{
        "run-completed": {
            action: async ({ run, percent_complete: pc2 }: any, { assistant, requirements, tasks, threads, percent_complete }: any) => {

                const messages: any = await this.callAPI('messages', 'list', { thread_id: run.thread_id });
                let latest_message = messages.data ? messages.data[0].content[0] : { text: { value: '' } };
                if (latest_message && latest_message.text) {
                    latest_message = latest_message.text.value;
                    latest_message = latest_message.replace(/\\n/g, '');
                    threads[run.thread_id].latest_message = latest_message;
                    this.setState({ threads });
                    this.emit('show-message', { message: latest_message });
                }
                console.log(highlight(latest_message, { language: 'markdown', ignoreIllegals: true }))
                if (percent_complete < 100) {
                    const action: any = {
                        percent_complete: percent_complete + 1,
                        chat: 'Lets continue with the next task.'
                    }
                    const thread = threads[run.thread_id].thread
                   
                    // create a new message and run
                    await this.callAPI('messages', 'create', {
                        thread_id: thread.id,
                        body: { role: 'user', content: JSON.stringify(action) }
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
                } else {
                    this.emit('session-complete', { run, latest_message });
                }
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
                    } catch (e) {
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
                    } catch (e) {
                        console.log('could not create assistant. Please check your API key and try again.')
                        process.exit(1);
                    }
                }
                this.setState({
                    assistants: { [assistant.id]: assistant },
                    assistant
                })

                // thread
                if (config.thread_id) {
                    thread = await this.callAPI('threads', 'retrieve', { thread_id: config.thread_id });
                } else {
                    thread = await this.callAPI('threads', 'create', { body: {} });
                }

                // run
                if (config.run_id) {
                    const run = await this.callAPI('runs', 'retrieve', { thread_id: thread.id, run_id: config.run_id });
                    // if the run is active, we keep the run in the state and we queue it
                    if (run.status === 'active' || run.status === 'requires_action') {
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
                config.assistant_id = assistant.id;
                config.thread_id = thread && thread.id;
                configManager.saveConfig(config);
                console.clear();
                console.log(`Session started with assistant ${assistant.id}${thread ? ', thread ' + thread.id : ''}}`);
                this.rl.prompt()      
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
                if (!thread) {
                    thread = await this.callAPI('threads', 'create', {
                        body: {}
                    });
                }
                // cancel any active runs
                let runs = await this.callAPI('runs', 'list', { thread_id: thread.id });
                if (runs.data.length > 0) {
                    await Promise.all(runs.data.map(async (run: any) => {
                        if (run.status === 'active' || run.status === 'requires_action') {
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
                if (run.status === 'active' || run.status === 'requires_action') {
                    await this.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                }
                console.log(`Run ${run.id} cancelled`);
            },
            nextState: null
        },
        "runs-retrieve": {
            action: async ({ thread_id }: any, state: any) => {
                process.stdout.write(emojis['runs-queued'].emoji);
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
        selectors: {
            action: async ({ values }: any, state: any) => {
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
            action: async ({ selector, value }: any, state: any) => {
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
        eval: {
            action: async ({ code }: any, state: any) => {
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
        get_file_tree: {
            action: async ({ value, n }: any, state: any) => {
                const fs = require('fs').promises; // Use the promise-based version of the fs module
                const cwd = process.cwd();
            
                const explore = async (dir: string, depth: number) => {
                    // Check if 'dir' is an absolute path. If not, join it with 'cwd'.
                    dir = path.isAbsolute(dir) ? dir : path.join(cwd, dir || '');
                    if (depth < 0) return null;
                    const directoryTree: any = { path: dir, children: [] };
                    try {
                        const filesAndDirs = await fs.readdir(dir, { withFileTypes: true });
                        for (const dirent of filesAndDirs) {
                            const fullPath = path.join(dir, dirent.name);
                            // Ignore node_modules and .git directories
                            if (dirent.isDirectory() && (dirent.name === 'node_modules' || dirent.name === '.git')) continue;
                            // If the dirent is a directory, recursively explore it
                            if (dirent.isDirectory()) {
                                const childDirectory = await explore(fullPath, depth - 1);
                                if (childDirectory) directoryTree.children.push(childDirectory);
                            } else {
                                directoryTree.children.push({ path: fullPath });
                            }
                        }
                    } catch (e: any) {
                        console.error(`Error reading directory ${dir}: ${e.message}`);
                        return { error: e.message, path: dir };
                    }
                    return directoryTree;
                };
                
            
                return explore(value || '.', n);
            },
            nextState: null
        },   
        image_describe: {
            action: async function ({ image_urls, data }: any, state: any, assistantAPI: AssistantAPI) {
                try {
                    const config = configManager.getConfig();
                    const OpenAI = require('openai');
                    const openai = new OpenAI({ apiKey: config.openai_api_key, dangerouslyAllowBrowser: true });
                    const chatMsg: any = {
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
                    }
                    const addImageToRequest = (url: any, detail: "low" | "high" = "high", base64encode: boolean) => {
                        if (base64encode) {
                            url = base64_encode(url)
                        }
                        const image: any = {
                            "type": "image_url",
                            "image_url": {
                                "url": url,
                                "detail": detail
                            }
                        }
                        chatMsg.messages[0].content.push(image)
                    }
                    for (let i = 0; i < image_urls.length; i++) {
                        addImageToRequest(image_urls[i].url, image_urls[i].detail, image_urls[i].base64encode)
                    }
                    const response = await openai.chat.completions.create(chatMsg);
                    return (response.choices[0].message.content as any)[0].text;
                } catch (err: any) {
                    return JSON.stringify(err.message);
                }
            },
            nextState: null
        },
        image_generate: {
            action: async ({ model = 'dall-e-3', prompt, response_format = 'url', n = 1}: any, state: any, assistantAPI: AssistantAPI) => {
                try {
                    const images = await assistantAPI.callAPI('images', 'generations', {
                        model,
                        prompt,
                        response_format
                    });
                    const result = [];
                    if(!globalThis.window) {
                        const fs = require('fs');
                        for (const image of images.data) {
                            let buffer; image.b64_json && (buffer = Buffer.from(image.b64_json, 'base64'));
                            const cwd = process.cwd();
                            const savePath = `${cwd}/${Date.now()}.png`;
                            buffer && fs.writeFileSync(savePath, buffer);
                            result.push(savePath);
                        }   
                    }
                    return result;
                } catch (err: any) {
                    return JSON.stringify(err.message);
                }
            },
            nextState: null
        },
        say_aloud: {
            action: async ({ text, voice }: any) => {
                require('dotenv').config();
                const PlayHT = require("playht");
                const fs = require('fs');
                var player = require('play-sound')({})

                var config = require('../config');
                const apiKey = config.PLAYHT_AUTHORIZATION;
                const userId = config.PLAYHT_USER_ID;
                const maleVoice = config.PLAYHT_MALE_VOICE;
                const femaleVoice = config.PLAYHT_FEMALE_VOICE;
                if (!voice) voice = config.PLAYHT_FEMALE_VOICE;
                if (!apiKey || !userId || !maleVoice || !femaleVoice) {
                    const missing = [];
                    if (!apiKey) missing.push('playHT.apiKey');
                    if (!userId) missing.push('playHT.userId');
                    if (!maleVoice) missing.push('playHT.maleVoice');
                    if (!femaleVoice) missing.push('playHT.femaleVoice');
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
                async function speakSentence(sentence: string, voice: string) {
                    if (!sentence) return;
                    const stream = await PlayHT.stream(sentence, {
                        voiceEngine: "PlayHT2.0-turbo",
                        voiceId: voice === 'male' ? maleVoice : femaleVoice,
                    });
                    const chunks: any = [];
                    stream.on("data", (chunk: any) => chunks.push(chunk));

                    return new Promise((resolve, reject) => {
                        stream.on("end", () => {
                            const buf = Buffer.concat(chunks);
                            // save the audio to a file
                            const filename = `${getNonce()}.mp3`;
                            fs.writeFileSync(filename, buf);
                            player.play(filename, function (err: any) {
                                fs.unlinkSync(filename);
                                resolve(`done`);
                            });
                        });
                    })
                }
                // split the text into sentences
                const sentences = text.split(/[.!?]/g).filter((sentence: any) => sentence.length > 0);
                const consumeSentence = async () => {
                    return new Promise((resolve, reject) => {
                        const loop: any = async () => {
                            const sentence = sentences.shift();
                            if (!sentence) return resolve('done');
                            await speakSentence(sentence, voice);
                            return await loop();
                        };
                        return loop();
                    });
                };
                await consumeSentence();
                return '(aloud) ' + text;
            },
            nextState: null
        },
        file: {
            action: async ({ operation, path, match, data, position, target }: any, { thread }: any, assistantAPI: any) =>{
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
                            await (async ({ path }, state) => {
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
                                    const ret = await assistantAPI.attachFile(path);
                                    return ret && `Successfully attached file ${path} to assistant ${this.name}` || `Error attaching file ${path} to assistant ${this.name}`;
                                } catch (err: any) {
                                    return `Error attaching file ${path} to assistant ${this.name}: ${err.message}`
                                }
                            })({ path }, this);
                            break;
                        case 'list_attached':
                            await (async (_dummy, assistant) => {
                                try {
                                    if (!assistant) {  return `Error: Could not create assistant`; }
                                    const myAssistantFiles = await assistantAPI.callAPI('files', 'list', { thread_id: thread.thread_id });
                                    return JSON.stringify(myAssistantFiles);
                                } catch (err: any) {
                                    return `Error: ${err.message}`
                                }
                            })(null, this);
                            break;
                        case 'detach':
                            await (async ({ path }, assistant) => {
                                path = pathModule.join(__dirname, '..', (path || ''));
                                if (!fs.existsSync(path)) { return `Error: File ${path} does not exist`; }
                                try {
                                    const ret = await assistantAPI.callAPI('files', 'delete', { thread_id: thread.id, file_id: path });
                                    return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                                } catch (err: any) {
                                    return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`
                                }
                            })({ path }, this);
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
        files: {
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
                                await (async ({ path }, self: AssistantAPI) => {
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
                                        const ret = await self.attachFile(path);
                                        return ret && `Successfully attached file ${path} to assistant ${self.name}` || `Error attaching file ${path} to assistant ${self.name}`;
                                    } catch (err: any) {
                                        return `Error attaching file ${path} to assistant ${self.name}: ${err.message}`
                                    }
                                })({ path }, self as any);
                                break;
                            case 'list_attached':
                                await (async (_dummy, assistant: AssistantAPI) => {
                                    try {
                                        if (!assistant) {
                                            return `Error: Could not create assistant`;
                                        }
                                        const myAssistantFiles = await assistant.listFiles();
                                        return JSON.stringify(myAssistantFiles);
                                    } catch (err: any) {
                                        return `Error: ${err.message}`
                                    }
                                })(null, self as any);
                                break;
                            case 'detach':
                                await (async ({ path }, assistant : AssistantAPI) => {
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
                                })({ path }, self as any);
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
        
    } }
    schemas: any = this.schemas.concat([
        { type: 'function', function: { name: 'selector', description: 'Get or set a selector\'s value on the page. Call with blank selector for the entire page. Call with no value to get the current value. Call with a value to set the elements innerHTML', parameters: { type: 'object', properties: { selector: { type: 'string', description: 'The selector to get or set. If not present, the function will return the entire page' }, value: { type: 'string', description: 'The new value to set the selector to. If not present, the function will return the current value' } } } } },
        { type: 'function', function: { name: 'selectors', description: 'Set multiple selectors at once', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The selectors to set', additionalProperties: { type: 'string' } } }, required: ['values'] } } },
        { type: 'function', function: { name: 'eval', description: 'Evaluate the given code and return the result', parameters: { type: 'object', properties: { code: { type: 'string', description: 'The code to evaluate' } }, required: ['code'] } } },
        { type: 'function', function: { name: 'get_file_tree', "description": 'Return a tree of files and folders `n` levels deep from the specified `path`.', "parameters": { "type": 'object', "properties": { "value": { "type": 'string', "description": 'The directory path from which to start the exploration.' }, n: { "type": 'number', "description": 'The depth of exploration.' } }, "required": ['path', 'n'] } } },
        { type: "function", function: { name: "file", "description": "Read, write, modify, and delete a file on the system. Supported operations are read, write, append, prepend, replace, insert_at, remove, delete, and copy.", "parameters": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, copy, attach, list_attached, detach." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } },
        { type: "function", function: { name: "files", "description": "Perform batch operations on files", "parameters": { "type": "object", "properties": { "operations": { "type": "array", "description": "The operations to perform on the files.", "items": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, and copy." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } }, "required": ["operations"] } } },
        { type: "function", function: { name: 'say_aloud', "description": 'say the text using text-to-speech', "parameters": { "type": 'object', "properties": { "text": { "type": 'string', "description": 'the text to say' }, "voice": { "type": 'string', "description": 'the voice to use (can be \'male\' or \'female\'). If not specified, the default female voice will be used' } }, "required": ['text'] } } },
        { type: 'function', function: { name: 'create-images', description: 'Create images from the given prompts', "parameters": {"type": 'object', "properties": {"prompts": {"type": 'array', "description": 'The prompts to generate images from', "items": {"type": 'object', "properties": {"prompt": {"type": 'string', "description": 'The message to send to the assistant'}, "n": {"type": 'integer', "description": 'The number of images to generate. max 1 image per prompt for dall-e-3, max 10 images per prompt for dall-e-2. default is 1'}, "model": {"type": 'string', "description": 'The model to use for generation. either "dall-e-2" or "dall-e-3". default is "dall-e-3"'}, "response": {"type": 'string', "description": 'The response format for the generated images. either "url" or "base64". default is "url"'}}, "required": ['prompt']}}}}}},

    //    { "type": 'function', "function": { "name": 'image_describe', "description": 'Given one or more images, describe it in text with as much detail as you can. This function can process multiple images simultaneously.', "type": 'object', "properties": { "image_urls": { "type": 'array', "description": 'The URLs of the images to describe', "items": { "type": 'object', "description": 'The image URL and options', "properties": { "url": { "type": 'string', "description": 'The URL or file path of the image to describe. If base64encode is true, this should be a file path.' }, "detail": { "type": 'string', "description": 'The level of detail to include in the description' }, "base64encode": { "type": 'boolean', "description": 'Whether to encode the image as base64 before sending it to the API' } }, "required": ['url'] } }, "required": ['image_urls'] } } }
    ]);
    
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
        this.actionHandlers = { ...this.actionHandlers, ...this.actionHandlers };

        this.loadTools(__dirname);

        // set the assistant's api key
        const config = configManager.getConfig();
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;

        this.setupActionHandlers([this.actionHandlers]);
    }
    async onLine(line: string) {
        this.callSync('send-message', { message: line, thread: this.state.thread });
    }
    async onClose() {
        const curThread = this.state.thread;
        if (!curThread) {
            console.log('Goodbye!')
            process.exit(0);
        }
        let runs = await this.callAPI('runs', 'list', { thread_id: curThread.id });
        runs = runs.data.map((run: any) => {
            if (run.status === 'active' || run.status === 'requires_action') {
                return run;
            } else {
                return null;
            }
        })
            .filter((run: any) => run);
        if (runs && runs.length > 0) {
            await Promise.all(runs.map(async (run: any) => {
                if (run.status === 'active' || run.status === 'requires_action') {
                    await this.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                }
            }));
            console.log(`Cancelled ${runs.length} active runs`);
        }
        if (runs.length > 0) {
            return;
        } else {
            console.log('Goodbye!');
            process.exit(0);
        }
    }
    beforeAction = (action: string, data: any, state: any) => {
        const out = (emojis as any)[action] ? (emojis as any)[action].emoji : '';
        if (out && action !== 'runs retrieve') {
            process.stdout.write('\n');
        }
        if (out) process.stdout.write(out);
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
            if (!files) {
                console.warn('No tools found in the tools folder');
                return;
            }
            files.forEach((file: any) => {
                const t = require(path.join(toolsFolder, file))
                if (!t.tools) {
                    console.warn('No tools found in the tools folder');
                    return;
                }
                Object.keys(t.tools).forEach((key: string) => {
                    if(!t.tools) {
                        console.warn(`Tool ${key} not found in tools`);
                        return;
                    }
                    const toolFunc = t.tools[key];
                    const schema = t.schemas.find((schema: { function: { name: string; }; }) => schema.function.name === key);
                    this.addTool(toolFunc, schema, t.state);
                    toolNames.push(key);
                    console.log(`Tool ${key} loaded`);
                })
            });
        } else {
            console.log('No tools found in the tools folder');
        }
        return toolNames;
    }
}

const assistant = new AssistantCLI();
assistant.emit('session-init', {});