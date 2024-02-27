import "dotenv/config";
const { EventEmitter } = require("eventemitter3");
const prompt = require("./prompt");
import { configManager } from "./config-manager";
const highlight = require('cli-highlight').highlight;

function getState(key: any) {
    const config = configManager.getConfig() || {};
    return config[key];
}

function setState(key: any, value: any) {
    const config = configManager.getConfig() || {};
    config[key] = value;
    configManager.setConfig(config);
    return value;
}

function base64_encode(file: any) {
    const fsSync = require('fs');
    if(!globalThis.window) {
        var bitmap = fsSync.readFileSync(file);
        return new Buffer(bitmap).toString('base64');
    } else {
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


const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default class AssistantAPI extends EventEmitter {
    serverUrl = 'https://api.openai.com/v1/';
    model = 'gpt-4';
    apiKey = process.env.OPENAI_API_KEY;
    state: any = {}
    name = 'anna';
    debug = false;
    prompt = prompt;
    // prompt= `You are a powerful AI assistant deeply integrated into VS Code. You have comprehensive control of this VS code running instance. Your task is to respond to the user's messages and perform the requested actions. You can use any tool to perform the actions. You can also use the state to maintain context across interactions.
    
    // ***Instructions***

    // Respond to the user's messages and perform the requested actions. You can use any tool to perform the actions. You can also use the state to maintain context across interactions.
    // - Respond to the user using the 'chat' tool. This will display the message in the chat window.
    // ***State***
    
    // You possess persistent state that can be used to store and retrieve information across multiple interactions. You are responsible for managing the state, and you can use this state to maintain context and manage complex workflows.
    // - Use the \`state\` tool to get or set state variables. You can define any state variable you need to maintain context across interactions.
    // - Use the \`states\` tool to get or set multiple state variable values at once.
    // - Use the \`state-keys\` tool to get the keys of the state variables.
    
    // ***IMPORTANT VARIABLES***
    // - \`requirements\`: The requirements (input, output)
    // - \`percent_complete\`: The percent complete (output)
    // - \`status\`: The status (output)
    // - \`tasks\`: The tasks (input, output)
    // - \`notes\`: The current AI notes (input, output)`

    selectorFunction = async ({ selector, value }: any, state: any) => {
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
                } else { return 'selector not found. Target "" to target the entire page'; }
            }
        } catch (error: any) { return error.message; }
    }

    apisDefinition(state: any) {
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
            "chat": {
                "completions": post(['chat', 'completions'], state.body),
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
            },
            'audio': {
                'speech': post(['audio', 'speech'], state.body),
                'transcription': post(['audio', 'transcription'], state.body)
            }
        };
    }

    async callAPI(type: any, api: any, params: any = {}, callDelay = 0, retries = 3, retryDelay = 1000): Promise<any> {
        const def: any = this.apisDefinition({
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
            if (callDelay > 0) {
                await delay(callDelay);
            }
            const reqData = {
                method: method.toUpperCase(),
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey || process.env.OPENAI_API_KEY}`,
                    "OpenAI-Beta": "assistants=v1",
                    "Accept": "application/json",
                },
                data: params.body // In Axios, the request payload is passed as `data` instead of `body`
            };
        
            const axios = await import('axios');
            const response = await axios.default(url.href, reqData);
            const r = response.data; // Axios automatically converts JSON responses into JavaScript objects
            if (r.id) {
                const r = response.data;
                let sts = (this.state as any)[type] || {};
                if (r.id) {
                    if (!sts) sts = {};
                    sts[r.id] = r;
                    (this.state as any)[type.slice(0, -1)] = r;
                } else if (r.data) {
                    r.data.forEach((d: any) => {
                        if (!sts) sts = {};
                        sts[d.id] = d;
                    });
                }
                this.emit(`${type}-${api}`, {
                    response: r,
                    type,
                    api
                });
                return r;
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

    // state getters and setters
    setState(newState: any) {
        this.state = { ...this.state, ...newState };
        setState('set-state', {
            assistant_id: this.state.assistant_id,
            thread_id: this.state.thread_id,
            run_id: this.state.run_id,
            runs: this.state.runs ? Object.values(this.state.runs).map((run: any) => ({
                latest_message: run.latest_message,
                id: run.id,
            })) : [],
        });
    }

    getState() { 
        if(!this.state) this.state = getState('vsca');
        return this.state || {};
    }

    getSchemas() {
        return Object.keys(this.actionHandlers).map((key) => {
            return this.actionHandlers[key].schema
        }).filter((schema) => schema);
    }

    async callSync(handlerName: any, data: any) { 
        try {
            return this.actionHandlers[handlerName].action(data, this.state, this); 
        } catch (error) {
            throw new Error(`Error calling action handler: ${handlerName}`);
        }
    }

    async callAsync(handlerName: any, data: any) { 
        return this.emit(handlerName, data);
    }
    
    loadActionHandlers() {
        for (const schemaName of Object.keys(this.actionHandlers)) {
            const schema = this.actionHandlers[schemaName].schema;
            if (schema && schema.type === 'function') {
                const tool_name = schema.function.name;
                try {
                    this.on(tool_name, async (data: any) => {
                        await this.actionHandlers[tool_name].action(data, this.state, this);
                        if (this.actionHandlers[tool_name].nextState) {
                            await this.actionHandlers[tool_name].nextState(data, this.state, this);
                        }
                    });
                    console.log(`Handler ${tool_name} set up`);
                }
                catch (error) {
                    console.error(`Error setting up action handler: ${tool_name}`, error);
                }
            } else {
                // we still add the handler to the event emitter
                this.on(schemaName, async (data: any) => {
                    await this.actionHandlers[schemaName](data, this.state, this);
                    if (this.actionHandlers[schemaName].nextState) {
                        await this.actionHandlers[schemaName].nextState(data, this.state, this);
                    }
                });
            }
        }
    }

    actionHandlers: any = {
        "browse-webpage": {
            schema: { type: 'function', function: { name: 'browse-webpage', description: 'Browse a webpage', parameters: { type: 'object', properties: { url: { type: 'string', description: 'The URL of the webpage to browse' } }, required: ['url'] } } },
            action: async ({ url }: any) => {
                let response, mainContent;
                const axios = require('axios');
                // Attempt to fetch page content
                try {
                    response = await axios.get(url);
                } catch (error) {
                    console.error('Error fetching URL:', url);
                    return `Error fetching URL: ${url}`
                }
                const {Readability} = require('@mozilla/readability');
                const {JSDOM} = require('jsdom');
                const { window } = new JSDOM(response.data);
                const dom = new JSDOM(response.data, { url });
                if(!dom) {
                    return `Error: No DOM found`;
                }
                // Attempt to extract using Readability
                try {
                    const reader = new Readability(window.document);
                    const article = reader.parse();
                    if (article && article.content) {
                    console.log('Content extracted via Readability');
                    return article.content;
                    }
                } catch (error: any) {
                    return `Error extracting content using Readability: ${error.message}`;
                }
            
                // Fallback: DOM inspection based on common selectors
                const selectors = ['#content', '#main', 'article', '.post', '.article', 'section'];
                for (const selector of selectors) {
                    mainContent = window.document.querySelector(selector);
                    if (mainContent) {
                    console.log(`Content extracted using selector: ${selector}`);
                    return mainContent.innerHTML;
                    }
                }
            
                // Further Fallback: Look for <article> or <p> tags
                mainContent = window.document.querySelector('article, p');
                if (mainContent) {
                    console.log('Content extracted using generic <article> or <p> tag');
                    return mainContent.innerHTML;
                }
            
                return `Error: No content found for URL: ${url}`;
                
            nextState: null
            }
        },
        "selectors": {
            schema: { type: 'function', function: { name: 'selectors', description: 'Set the value of multiple elements on the page', parameters: { type: 'object', properties: { selectors: { type: 'object', description: 'The selectors and values to set', additionalProperties: { type: 'string' } } } } } },
            action: async ({ values }: any, state: any) => {
                const results = [];
                for (const selector in values) {
                    results.push(this.selectorFunction({ selector, value: values[selector] }, state));
                }
                return results.join('\n') || 'undefined';
            },
            nextState: null
        },
        "selector": {
            schema: { type: 'function', function: { name: 'selector', description: 'Select an element on the page and set its value', parameters: { type: 'object', properties: { selector: { type: 'string', description: 'The selector to use to select the element' }, value: { type: 'string', description: 'The value to set the element to' } } } } },
            action: this.selectorFunction,
            nextState: null
        },
        "image-describe": {
            //schema: { type: 'function', function: { name: 'image-describe', description: 'Describe an image using GPT-4', parameters: { type: 'object', properties: { image_urls: { type: 'array', description: 'The URLs of the images to describe', items: { type: 'string' } }, data: { type: 'string', description: 'The data to use for describing the images' } }, required: ['image_urls'] } } },
            action: async function ({ image_urls, data }: any, state: any, assistantAPI: any) {
                try {
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
                    }
                    const addImageToRequest = (url: any, detail = "high", base64encode: any) => {
                        if (base64encode) {
                            url = base64_encode(url)
                        }
                        const image = {
                            "type": "image_url",
                            "image_url": {
                                "url": url,
                                "detail": detail
                            }
                        }
                        // @ts-ignore
                        chatMsg.messages[0].content.push(image)
                    }
                    for (let i = 0; i < image_urls.length; i++) {
                        addImageToRequest(image_urls[i].url, image_urls[i].detail, image_urls[i].base64encode)
                    }
                    const response = await assistantAPI.callAPI('chat', 'completions', { body: chatMsg });
                    return (response.choices[0].message.content)[0].text;
                } catch (err: any) {
                    return JSON.stringify(err.message);
                }
            },
            nextState: null
        },
        "image-generate": {
            schema: { type: 'function', function: { name: 'image-generate', description: 'Generate an image using DALL-E', parameters: { type: 'object', properties: { model: { type: 'string', description: 'The model to use for generating the image' }, prompt: { type: 'string', description: 'The prompt to use for generating the image' }, response_format: { type: 'string', description: 'The format of the response: url, base64, or json' }, n: { type: 'integer', description: 'The number of images to generate' } }, required: ['prompt'] } } },
            action: async ({ model = 'dall-e-3', prompt, response_format = 'url', n = 1}: any, state: any, assistantAPI: any) => {
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
        "chat": {
            schema: { type: 'function', function: { name: 'chat', description: 'Send a message to the user', parameters: { type: 'object', properties: { message: { type: 'string', description: 'The message to send' } }, required: ['message'] } } },
            action: async ({ message }: any, state: any, api: any) => {
                console.log(highlight(message, { language: 'markdown', ignoreIllegals: true }));
                this.setState({ message });
                return 'sent message';
            },
            nextState: null
        },
        "say-aloud": {
            schema: { type: "function", function: { name: 'say-aloud', description: 'say the text using text-to-speech', parameters: { "type": 'object', "properties": { "text": { "type": 'string', "description": 'the text to say' }, "voice": { "type": 'string', "description": 'the voice to use (can be \'male\' or \'female\'). If not specified, the default female voice will be used' } }, "required": ['text'] } } },
            action: async ({ text, voice }: any) => {
                const fs = require('fs');
                const PlayHT = require('playht');
                const player = require('play-sound')((error: any) => {
                    if (error) console.error('Error playing sound:', error);
                });
                const apiKey = process.env.PLAYHT_AUTHORIZATION;
                const userId = process.env.PLAYHT_USER_ID;
                const maleVoice = process.env.PLAYHT_MALE_VOICE;
                const femaleVoice = process.env.PLAYHT_FEMALE_VOICE;
                if (!voice) voice = process.env.PLAYHT_FEMALE_VOICE;
                if (!apiKey || !userId || !maleVoice || !femaleVoice) {
                    const missing = [];
                    if (!apiKey) missing.push('playHT.apiKey');
                    if (!userId) missing.push('playHT.userId');
                    if (!maleVoice) missing.push('playHT.maleVoice');
                    if (!femaleVoice) missing.push('playHT.femaleVoice');
                    return `Missing configuration: ${missing.join(', ')} in configuration file. Please ask the user to provide the missing configuration using the ask_for_data tool.`;
                }
                PlayHT.init({ apiKey: apiKey, userId: userId, });
                function getNonce() {
                    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                }
                async function speakSentence(sentence: any, voice: any) {
                    if (!sentence) return;
                    const stream = await PlayHT.stream(sentence, {
                        voiceEngine: "PlayHT2.0-turbo",
                        voiceId: voice === 'male' ? maleVoice : femaleVoice,
                    });
                    const chunks: any = [];
                    stream.on("data", (chunk: any) => chunks.push(chunk));
                    console.log(`${sentence}`);
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
                return text;
            },
            nextState: null
        },
        "get-file-tree": {
            schema: { type: 'function', function: { name: 'get-file-tree', description: 'Get the file tree of the current directory', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The path of the directory to explore' }, n: { type: 'integer', description: 'The depth of the directory tree to explore' } } } } },
            action: async ({ value, n }: any) => {
                try {
                    // Use the directory-tree package, passing the path and options including depth
                    const dirTree = require("directory-tree");
                    const tree = dirTree(value, { depth: n });
                    // Return the tree or an appropriate message if no tree is generated
                    return tree || { message: "No directory tree could be generated for the given path and depth." };
                } catch (error: any) {
                    console.error(`Error generating directory tree: ${error.message}`);
                    return { error: error.message };
                }
            },
            nextState: null
        },
        "file": {
            schema: { type: 'function', function: { name: 'file', description: 'Perform operations on a file', parameters: { type: 'object', properties: { operation: { type: 'string', description: 'The operation to perform: read, write, append, prepend, replace, insert_at, remove, delete, copy, attach, list_attached, detach' }, path: { type: 'string', description: 'The path of the file to perform the operation on' }, match: { type: 'string', description: 'The string to match in the file' }, data: { type: 'string', description: 'The data to write to the file' }, position: { type: 'integer', description: 'The position to insert the data at' }, target: { type: 'string', description: 'The path of the target file for the copy operation' } }, required: ['operation'] } } },
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
        "files": {
            schema: { type: 'function', function: { name: 'files', description: 'Perform batch operations on files', parameters: { type: 'object', properties: { operations: { type: 'array', description: 'The operations to perform', items: { type: 'object', properties: { operation: { type: 'string', description: 'The operation to perform: read, write, append, prepend, replace, insert_at, remove, delete, copy' }, path: { type: 'string', description: 'The path of the file to perform the operation on' }, match: { type: 'string', description: 'The string to match in the file' }, data: { type: 'string', description: 'The data to write to the file' }, position: { type: 'integer', description: 'The position to insert the data at' }, target: { type: 'string', description: 'The path of the target file for the copy operation' } }, required: ['operation'] } } } } } },
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
        "state": {
            schema: { type: 'function', function: { name: 'state', description: 'Get or set a named variable\'s value. Call with no value to get the current value. Call with a value to set the variable', parameters: { type: 'object', properties: { name: { type: 'string', description: 'The variable\'s name. required' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } } },
            action: ({ name, value }: any, state: any, api: any) => {
                if (value) {
                    state[name] = value;
                    return state[name];
                } else {
                    return state[name];
                }
            },
            nextState: null
        },
        "states": {
            schema: { type: 'function', function: { name: 'states', description: 'Set multiple state variables at once', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The variables to set', additionalProperties: { type: 'string' } } }, required: ['values'] } } },
            action: async ({ values }: any, state: any, api: any) => {
                for (const name in values) {
                    state[name] = values[name];
                }
                return JSON.stringify(state);
            },
            nextState: null
        },
        "clear-state": {
            action: async () => {
                this.state = { ...this.state, assistant_id: null, thread_id: null, run_id: null, runs: null, threads: null };
            },
            nextState: null
        },
        "tasks-set": {
            schema: { type: 'function', function: { name: 'tasks-set', description: 'Set the tasks', parameters: { type: 'object', properties: { tasks: { type: 'array', description: 'The tasks to set', items: { type: 'string' } } }, required: ['tasks'] } } },
            action: async ({ tasks }: any, state: any, api: any) => {
                state.tasks = tasks;
                state.current_task = tasks[0];
                return JSON.stringify(state);
            },
            nextState: null
        },
        "eval": {
            schema: { type: 'function', function: { name: 'eval', description: 'Evaluate a JavaScript expression in the globalThis context', parameters: { type: 'object', properties: { code: { type: 'string', description: 'The JavaScript code to evaluate' } }, required: ['code'] } } },
            action: async ({ code }: any, state: any, api: any) => {
                function evalInContext(js: any, context: any) {
                    return function() { return eval(js); }.call(context);
                }
                return evalInContext(code, {
                    ...globalThis
                });
            },
            nextState: null
        },
        "call-openai-api": {
            action: async ({ type, name, params }: any, state: any, api: any) => {
                return await this.callAPI(type, name, params);
            },
            nextState: null
        },
        "assistant-create": {
            action: async ({ instructions, model, name, tools }: any, { assistants }: any, api: any) => {
                const schemas = this.getSchemas();
                const newAssistant = await api.callAPI('assistants', 'create', {
                    body: {
                        instructions,
                        model,
                        name,
                        schemas
                    }
                });
                assistants = assistants || {};
                assistants[newAssistant.id] = newAssistant;
                api.setState({ assistants });
                return { assistant: newAssistant };
            },
            nextState: null
        },
        "send-message": {
            action: async (
                { message, thread_id, assistant_id, requirements, percent_complete, status, tasks, notes }: any,
                { assistant, thread, run }: any, 
                api: any
                ) => {
                const inputFrame = {
                    chat: message,
                    requirements,
                    percent_complete,
                    status,
                    tasks,
                    notes
                }
                if(!assistant) {
                    if(assistant_id) {
                        assistant = await api.callSync('assistants', 'retrieve', { assistant_id });
                    }
                    assistant = await api.callAPI('assistants', 'create', {
                        body: {
                            instructions: this.prompt.default,
                            model: 'gpt-4-turbo-preview',
                            name: 'assistant',
                            tools: api.getSchemas()
                        }
                    });
                    api.setState({ assistant, assistant_id: assistant.id });
                }
                if (thread_id || thread) {
                    thread_id = thread_id || thread.id;
                    thread = await api.callAPI('threads', 'retrieve', { thread_id });
                } else {
                    thread = await api.callAPI('threads', 'create', {});
                }
                api.setState({
                    thread,
                    threads: { [thread.id]: { thread } },
                    thread_id: thread.id
                });

                // create a new run and message
                await api.callAPI('messages', 'create', {
                    thread_id: thread.id,
                    body: { role: 'user', content: JSON.stringify(inputFrame) }
                });
                run = await api.callAPI('runs', 'create', {
                    thread_id: thread.id,
                    body: { assistant_id: assistant.id }
                });
                api.setState({ 
                    threads: { [thread.id]: { thread, runs: { [run.id]: run }, run } },
                    runs: { [run.id]: run },
                    run
                });
                
                // queue the run
                await api.emit('run-queued', { run });
            },
            nextState: null
        },
        "run-queued": {
            "action": async ({ run }: any, { thread }: any) => {
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
                return { run, thread };
            },
            "nextState": null
        },
        "run-cancel-inactive": {
            action: async ({ run }: any, _: any, api: any) => {
                if (run.status === 'active' || run.status === 'requires_action') {
                    this.emit('runs-queue', { run });
                } else {
                    await api.callSync('runs-cancel', { run });
                }
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
                            let result = await this.callSync(tool_call[tool_call.type].name, JSON.parse(tool_call[tool_call.type].arguments));
                            tool_call.output = result || 'undefined';
                            toolOutputs.push({
                                tool_call_id: tool_call.id,
                                output: JSON.stringify(tool_call.output)
                            });
                            toolcallmap[tool_call.id] = tool_call;
                        }
                        else {
                            tool_call.output = `Tool not found: ${tool_call.function.name}`;
                            const availableTools = Object.keys(this.actionHandlers);
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
                    toolOutputs.length > 0 && await this.callAPI('runs', 'submit_tool_outputs', {
                        thread_id: run.thread_id, run_id: run.id, body: {
                            tool_outputs: toolOutputs,
                        }
                    });
                    this.emit('run-queued', { run: this.state.run });
                }
            },
            nextState: null
        },
        "run-completed": {
            action: async (
                { run }: any, 
                { chat, threads, thread }: any, 
                api: any
            ) => {
                const messages = await this.callAPI('messages', 'list', { thread_id: run.thread_id });
                let latest_message = messages && messages.data ? messages.data[0].content[0] : { text: { value: '' } };
                if (latest_message && latest_message.text) {
                    latest_message = latest_message.text.value;
                    latest_message = latest_message.replace(/\\n/g, '');
                    threads = threads || {};
                    threads[run.thread_id].latest_message = latest_message || chat;
                    thread.latest_message = latest_message;
                    this.setState({ 
                        runs: { [run.id]: {
                            latest_message,
                            id: run.id
                        } },
                    });
                }
                api.emit('session-complete', { run, latest_message: latest_message || chat });
            },
            nextState: null
        },
        "npm-list-npm-libraries": {
            schema: { type: 'function', function: { name: 'npm-list-npm-libraries', description: 'List all npm libraries in the current workspace', parameters: { type: 'object', properties: { path: { type: 'string', description: 'The path of the directory to list the npm libraries from' } } } } },
            action: async function (_: any, run: any) {
                const fs = require('fs');
                const pathModule = require('path');
                let cwd = process.cwd();
                return new Promise((resolve, reject) => {
                    let packageJson = pathModule.join(cwd, 'package.json');
                    if (!fs.existsSync(packageJson)) {
                        resolve('No package.json found in the current directory');
                    }
                    let pkg = require(packageJson);
                    let dependencies = pkg.dependencies || {};
                    let devDependencies = pkg.devDependencies || {};
                    let allDependencies = {...dependencies, ...devDependencies};
                    let result = JSON.stringify( Object.keys(allDependencies) );
                    resolve(result);
                });
            },
            nextState: null
        },
        "npm-install-npm-library": {
            schema: { type: 'function', function: { name: 'npm-install-npm-library', description: 'Install an npm library in the current workspace', parameters: { type: 'object', properties: { library: { type: 'string', description: 'The name of the npm library to install' } } } } },
            action: async function ({ library }: any, run: any) {
                const { exec } = require('child_process');
                const fs = require('fs');
                const pathModule = require('path');
                let cwd = process.cwd();
                return new Promise((resolve, reject) => {
                    let packageJson = pathModule.join(cwd, 'package.json');
                    if (!fs.existsSync(packageJson)) {
                        resolve('No package.json found in the current directory');
                    }
                    exec(`npm install ${library}`, (error: any, stdout: any, stderr: any) => {
                        if (error) {
                            resolve(`Error: ${error.message}`);
                        }
                        if (stderr) {
                            resolve(`Error: ${stderr}`);
                        }
                        resolve(stdout);
                    });
                });
            },
            nextState: null
        },
        "npm-call-npm-method": {
            //schema: { type: 'function', function: { name: 'npm-call-npm-method', description: 'Call an npm method in the current workspace', parameters: { type: 'object', properties: { method: { type: 'string', description: 'The npm method to call' }, args: { type: 'array', description: 'The arguments to pass to the method' } } } } },
            action: async function ({ method, args }: any, run: any) {
                const { exec } = require('child_process');
                const fs = require('fs');
                const pathModule = require('path');
                let cwd = process.cwd();
                return new Promise((resolve, reject) => {
                    let packageJson = pathModule.join(cwd, 'package.json');
                    if (!fs.existsSync(packageJson)) {
                        resolve('No package.json found in the current directory');
                    }
                    exec(`npm ${method} ${args.join(' ')}`, (error: any, stdout: any, stderr: any) => {
                        if (error) {
                            resolve(`Error: ${error.message}`);
                        }
                        if (stderr) {
                            resolve(`Error: ${stderr}`);
                        }
                        resolve(stdout);
                    });
                });
            },
        },
        "session-complete": {
            action: async ({ run, latest_message }: any, { chat }: any, api: any) => {
               // console.log(latest_message || chat);
                return { run, latest_message };
            },
            nextState: null
        }
    }

    constructor(serverUrl = 'https://api.openai.com/v1/') {
        super();
        this.serverUrl = serverUrl || 'https://api.openai.com/v1/';
        this.model = 'gpt-4-turbo-preview';
        this.name = 'assistant';
        this.debug = false;
        this.loadActionHandlers();
    }
    async chat(message: any) {
        return new Promise((resolve, reject) => {
            this.once('session-complete', ({ run, latest_message }: any, state: any, api: any) => {
                resolve({ run, latest_message });
            });
            const curState = {
                message,
                assistant_id: this.state.assistant_id,
                requirements: message,
                percent_complete: 0,
                status: 'in progress',
                tasks: [],
                current_task: '',
            }
            return this.emit('send-message', curState);
        });
    }
}


