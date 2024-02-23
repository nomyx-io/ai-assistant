import AssistantAPI from "./assistant";
import { configManager} from "./config-manager";
import path from 'path';
import emojis from './emo'
import prompt from './prompt';
const readline = require('readline');

import { generateUsername } from "unique-username-generator";
const highlight = require('cli-highlight').highlight;
const loadConfig = () => configManager.getConfig();

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);''

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

class TerminalSessionManager {

    prompt = prompt;
    
    sessions: TerminalSession[];
    activeSessionIndex: number;
    readlineInterface:any;
    assistantAPI: AssistantAPI;

    model = 'gpt-4-turbo-preview';
    name = 'assistant';
    
    actionHandlers: any = {
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
                const fs = require('fs');
                const pathModule = require('path');
                const cwd = process.cwd();
                const explore = (dir: any, depth: any) => {
                    dir = pathModule.join(cwd, (dir || ''))
                    if (depth < 0) return null;
                    const directoryTree: any = { path: dir, children: [] };
                    try {
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
        // ********** action handlers **********
        "run-completed": {
            action: async ({ run, percent_complete: pc2 }: any, { requirements, tasks, threads, percent_complete }: any, assistantAPI: AssistantAPI) => {

                const messages: any = await assistantAPI.callAPI('messages', 'list', { thread_id: run.thread_id });
                let latest_message = messages.data ? messages.data[0].content[0] : { text: { value: '' } };
                if (latest_message && latest_message.text) {
                    latest_message = latest_message.text.value;
                    latest_message = latest_message.replace(/\\n/g, '');
                    threads[run.thread_id].latest_message = latest_message;
                    assistantAPI.setState({ threads });
                    assistantAPI.emit('show-message', { message: latest_message });
                }
                console.log(highlight(latest_message, { language: 'markdown', ignoreIllegals: true }))
                if (percent_complete < 100 && requirements.length > 0) {
                    const action: any = {
                        requirements,
                        percent_complete: percent_complete + 1,
                        chat: 'Lets continue with the next task.'
                    }
                    assistantAPI.emit('assistant-input', action);
                } else {
                    assistantAPI.emit('session-complete', { run, latest_message });
                }
            },
            nextState: null
        },
        "session-init": {
            action: async ({ run: run_param }: any, { assistant, thread, run }: any, assistantAPI: AssistantAPI) => {
                const config = loadConfig();
                assistantAPI.apiKey = config.apiKey || process.env.OPENAI_API_KEY;

                // thread
                if (config.thread_id) {
                    thread = await assistantAPI.callAPI('threads', 'retrieve', { thread_id: config.thread_id });
                } else {
                    thread = await assistantAPI.callAPI('threads', 'create', { body: {} });
                }

                // run
                if (config.run_id) {
                    const run = await assistantAPI.callAPI('runs', 'retrieve', { thread_id: thread.id, run_id: config.run_id });
                    // if the run is active, we keep the run in the state and we queue it
                    if (run.status === 'active' || run.status === 'requires_action') {
                        assistantAPI.setState({ run });
                        assistantAPI.emit('runs-queue', { run });
                    } else { await assistantAPI.callSync('runs-cancel', { run }); }
                }

                assistantAPI.setState({
                    assistants: { [assistant.id]: assistant },
                    assistant,
                    threads: { [thread.id]: { thread, runs: {} } },
                    thread
                });
                const sessionInfo = { assistant, thread, run: config.run_id ? { id: config.run_id } : null }
                await assistantAPI.callSync('session-start', sessionInfo);
            },
            nextState: null
        },
        "session-start": {
            action: async ({ assistant, thread, run }: any, state: any) => {
                const config = configManager.loadConfig();
                config.assistant_id = assistant.id;
                config.thread_id = thread && thread.id;
                config.run_id = run && run.id;
                config.state = state;
                configManager.saveConfig(config);
                console.log(`Session started with assistant ${assistant.id}${thread ? ', thread ' + thread.id : ''}}`);
                //this.rea
            },
            nextState: null
        },
        "send-message": {
            action: async ({ message, thread }: any, { assistant, run, requirements, percent_complete = 0, status = 'in progress', tasks = [], current_task = '', chat = '' }: any, assistantAPI: AssistantAPI) => {
                const inputFrame = {
                    requirements: requirements ? requirements : message,
                    percent_complete,
                    status,
                    tasks,
                    current_task,
                    chat: requirements ? message : ''
                }
                if (!thread) {
                    thread = await assistantAPI.callAPI('threads', 'create', {
                        body: {}
                    });
                }
                // cancel any active runs
                let runs = await assistantAPI.callAPI('runs', 'list', { thread_id: thread.id });
                if (runs.data.length > 0) {
                    await Promise.all(runs.data.map(async (run: any) => {
                        if (run.status === 'active' || run.status === 'requires_action') {
                            await assistantAPI.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                        }
                    }));
                }
                // create a new message and run
                await assistantAPI.callAPI('messages', 'create', {
                    thread_id: thread.id,
                    body: { role: 'user', content: JSON.stringify(inputFrame) }
                });
                run = await assistantAPI.callAPI('runs', 'create', {
                    thread_id: thread.id,
                    body: { assistant_id: assistant.id }
                });
                assistantAPI.setState({
                    threads: { [thread.id]: { thread, runs: { [run.id]: run }, run } },
                    thread,
                    runs: { [run.id]: run },
                    run
                });
                await assistantAPI.callSync('run-queued', { run });
            },
            nextState: null
        },
        "run-cancel": {
            action: async ({ run }: any, state: any, assistantAPI: any) => {
                if (run.status === 'active' || run.status === 'requires_action') {
                    await assistantAPI.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
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
                config.state = this.state;
                configManager.saveConfig(config);
            },
            nextState: null
        },
    };

    schemas: any[] = [
        { type: 'function', function: { name: 'selector', description: 'Get or set a selector\'s value on the page. Call with blank selector for the entire page. Call with no value to get the current value. Call with a value to set the elements innerHTML', parameters: { type: 'object', properties: { selector: { type: 'string', description: 'The selector to get or set. If not present, the function will return the entire page' }, value: { type: 'string', description: 'The new value to set the selector to. If not present, the function will return the current value' } } } } },
        { type: 'function', function: { name: 'selectors', description: 'Set multiple selectors at once', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The selectors to set', additionalProperties: { type: 'string' } } }, required: ['values'] } } },
        { type: 'function', function: { name: 'eval', description: 'Evaluate the given code and return the result', parameters: { type: 'object', properties: { code: { type: 'string', description: 'The code to evaluate' } }, required: ['code'] } } },
        { type: 'function', function: { name: 'get_file_tree', "description": 'Return a tree of files and folders `n` levels deep from the specified `path`.', "parameters": { "type": 'object', "properties": { "value": { "type": 'string', "description": 'The directory path from which to start the exploration.' }, n: { "type": 'number', "description": 'The depth of exploration.' } }, "required": ['path', 'n'] } } },
        { type: "function", function: { name: "file", "description": "Read, write, modify, and delete a file on the system. Supported operations are read, write, append, prepend, replace, insert_at, remove, delete, and copy.", "parameters": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, copy, attach, list_attached, detach." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } },
        { type: "function", function: { name: "files", "description": "Perform batch operations on files", "parameters": { "type": "object", "properties": { "operations": { "type": "array", "description": "The operations to perform on the files.", "items": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, and copy." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } }, "required": ["operations"] } } },
        { type: "function", function: { name: 'say_aloud', "description": 'say the text using text-to-speech', "parameters": { "type": 'object', "properties": { "text": { "type": 'string', "description": 'the text to say' }, "voice": { "type": 'string', "description": 'the voice to use (can be \'male\' or \'female\'). If not specified, the default female voice will be used' } }, "required": ['text'] } } },
        { type: 'function', function: { name: 'create-images', description: 'Create images from the given prompts', "parameters": {"type": 'object', "properties": {"prompts": {"type": 'array', "description": 'The prompts to generate images from', "items": {"type": 'object', "properties": {"prompt": {"type": 'string', "description": 'The message to send to the assistant'}, "n": {"type": 'integer', "description": 'The number of images to generate. max 1 image per prompt for dall-e-3, max 10 images per prompt for dall-e-2. default is 1'}, "model": {"type": 'string', "description": 'The model to use for generation. either "dall-e-2" or "dall-e-3". default is "dall-e-3"'}, "response": {"type": 'string', "description": 'The response format for the generated images. either "url" or "base64". default is "url"'}}, "required": ['prompt']}}}}}},
        //{ type: "function", function: { name: "multi_assistant", description: "Spawn multiple assistants (long-running AI processes) in parallel. This is useful for building an html page where each agent handles a different part of the page.", "parameters": { "type": "object", "properties": { "prompts": { "type": "array", "description": "The prompts to spawn", "items": { "type": "object", "properties": { "message": { "type": "string", "description": "The message to send to the assistant" } }, "required": ["message"] } } }, "required": ["agents"] } } },
    ];

    state: any = {
        requirements: 'no requirements set',
        percent_complete: 0,
        status: 'idle',
        tasks: [],
        current_task: '',
        notes: 'no AI notes.',
        chat: 'no chat messages'
    };

    constructor() {
        this.sessions = [];
        this.activeSessionIndex = 0;
        this.initializeReadline();
        this.assistantAPI = new AssistantAPI();
        this.name = generateUsername("", 2, 38);
        this.loadTools(__dirname);
    }

    async initAssistant(terminalSession: TerminalSession) {
        const { schemas } = this.getTools();
        const config = configManager.loadConfig();
        let assistant: any;
        // assistant
        if (config.assistant_id) {
            try {
                assistant = await terminalSession.callAPI('assistants', 'retrieve', { assistant_id: config.assistant_id });
            } catch (e) {
                console.log('Assistant not found. Creating a new assistant.');
                assistant = await terminalSession.callAPI('assistants', 'create', {
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
                assistant = await terminalSession.callAPI('assistants', 'create', {
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
        terminalSession.setState({ assistants: { [assistant.id]: assistant }, assistant })
    }

    beforeAction = async (action: string, data: any, state: any) => {
        const out = (emojis as any)[action] ? (emojis as any)[action].emoji : '';
        if (out && action !== 'runs retrieve') {
            process.stdout.write('\n');
        }
        if (out) process.stdout.write(out);

        // save application state
        const config = configManager.loadConfig();
        config.state = state;
        configManager.saveConfig(config);
    }

    afterAction = async (action: string, data: any, state: any) => {

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
            } else if (isCtrlAPressed) {
                if (key.name === 'n') {
                    this.createNewSession();
                    isCtrlAPressed = false; // Reset flag after handling
                } else if (key.name === 'c') {
                    this.switchToNextSession();
                    isCtrlAPressed = false; // Reset flag after handling
                }
            } else {
                isCtrlAPressed = false; // Reset flag if other keys are pressed
            }
        });

        this.readlineInterface.on('line', (line: string) => {
            this.executeCommandInActiveSession(line);
            this.readlineInterface.prompt();
        }).on('close', () => {
            console.log('Session closed');
            process.exit(0);
        });

        this.createNewSession(); // Start with one session open
        this.initAssistant(this.sessions[0]);
        setTimeout(()=>this.readlineInterface.prompt(), 100);
    }

    addTool(tool: any, schema: any, state: any): void {
        const toolName: string = tool.name || '';
        this.actionHandlers[toolName] = tool;
        this.schemas.push(schema);
        this.state = { ...this.state, ...state}
        // (this as any)[toolName] = tool.bind(this);
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

    createNewSession() {
        const newSession = new TerminalSession(this);
        this.sessions.push(newSession);
        this.activeSessionIndex = this.sessions.length - 1;
        this.switchToSession(this.activeSessionIndex);
        console.clear();
        newSession.emit('session-init', {})
        console.log('New session created.');
    }

    switchToNextSession() {
        this.activeSessionIndex = (this.activeSessionIndex + 1) % this.sessions.length;
        this.switchToSession(this.activeSessionIndex);
        // clear the screen
        console.clear();
        console.log('Switched to next session.');
    }

    switchToSession(index: number) {
        console.log(`Switched to session ${index}.`);
        this.sessions[this.activeSessionIndex].printHistory();
    }

    executeCommandInActiveSession(command: string) {
        this.sessions[this.activeSessionIndex].executeCommand(command);
    }
}

class TerminalSession extends AssistantAPI {
    state = {
        requirements: 'no requirements set',
        percent_complete: 0,
        status: 'idle',
        tasks: [],
        current_task: '',
        notes: 'no AI notes.',
        chat: 'no chat messages'
    };
    history: string[];

    actionHandlers: any = {
       
    };

    constructor(public manager: TerminalSessionManager) {
        super()
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

        Object.entries(manager.actionHandlers).forEach(([handlerName, handler]: any) => {
            this.actionHandlers[handlerName] = { action: handler.action, nextState: handler.nextState };
            try {
                (this as any)[handler.handleType || 'on'](handlerName, async (data: any) => {
                    if (this.beforeAction) await this.beforeAction(handlerName, data, this.state, this);
                    await handler.aaction(data, this.state, this);
                    if (this.afterAction) await this.afterAction(handlerName, data, this.state, this);
                    if (handler.nextState) { this.emit(handler.nextState, this.state); }
                }, this);
            }
            catch (error) {
                console.error(`Error setting up action handler: ${handlerName}`, error);
            }
        });
    }

    executeCommand(command: string) {
        this.history.push( command);
        this.emit('send-message', command);
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


    setState(newState: any) {
        this.state = { ...this.state, ...newState };
        this.emit('state', this.state);
    }

    getState() { return JSON.parse(JSON.stringify(this.state)); }

    async callSync(handlerName: any, data: any) { return this.actionHandlers[handlerName].action(data, this.state); }
    
}
new TerminalSessionManager()