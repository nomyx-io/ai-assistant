import "dotenv/config";
const { EventEmitter } = require("eventemitter3");
const prompt = require("./prompt").default;
import { configManager } from "./config-manager";
import emojis from "./emojis";

function getState() {
    const config = configManager.getConfig() || {};
    return config.state || {};
}

function setState(value: any) {
    const config = configManager.getConfig() || {};
    config.state = { ...config.state, ...value };
    configManager.setConfig(config);
    return config.state;
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
    services: any = {};

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
                let callState = {};
                // if the type ends with s then slice it off
                const singular = type.slice(-1) === 's' ? type.slice(0, -1) : type;
                const plural = type.slice(-1) === 's' ? type : `${type}s`;
                if (r.id) {
                    callState = {
                        [plural]: { [r.id]: r, },
                        [singular]: r
                    }
                } else if (r.data) {
                    r.data.forEach((d: any) => {
                        const itemState = {
                            [plural]: { [d.id]: d, },
                            [singular]: d
                        }
                        callState = { ...callState, ...itemState}
                    });
                }
                this.state = { ...this.state, ...callState}
                this.emit(`${plural}-${api}`, { ...callState, type, api, });
                return r;
            }
        }
        catch (error: any) {
            if (retries > 0 && [429, 503].includes(error.status)) {
                console.warn(`Request failed, retrying after ${retryDelay}ms...`, error);
                await delay(retryDelay);
                return this.callAPI(type, api, params, retries - 1, 0, retryDelay * 2);
            } else {
                console.error(`Error calling API: ${path}`, error);
                return error;
            }
        }
    }

    // state getters and setters
    setState(newState: any) {
        this.state = setState(newState);
    }

    getState() { 
        return getState();
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
            this.on(schemaName, async (data: any) => {
                const maybeFunction = this.actionHandlers[schemaName] ? this.actionHandlers[schemaName].action : null;
                if (!maybeFunction) {
                    console.error(`No action handler found for: ${schemaName}`);
                    return
                }
                if((emojis as any)[schemaName]) process.stdout.write((emojis as any)[schemaName].emoji);
                else process.stdout.write(schemaName+'\n');
                await maybeFunction(data, this.state, this);
                if (this.actionHandlers[schemaName].nextState) {
                    if(this.actionHandlers[schemaName].delay) {
                        await delay(this.actionHandlers[schemaName].delay);
                    }
                    await this.actionHandlers[this.actionHandlers[schemaName].nextState].action(data, this.state, this);
                }
            });
            console.log(`Loaded action handler: ${schemaName}`);
        }
    }

    loadTools(toolsFolder: string) {
        const fs = require('fs');
        const path = require('path');
        const tools = fs.readdirSync(toolsFolder);
        for (const tool of tools) {
            const toolPath = path.join(toolsFolder, tool);
            const toolName = tool.split('.')[0];
            const toolModule = require(toolPath);
            Object.entries(toolModule.tools).forEach((keyValue: any) => {
                if(!toolModule.enabled) {
                    console.log(`Tool ${toolName} is not enabled.`);
                    return;
                }
                const [name, actionHandler] = keyValue;
                const { action, schema } = actionHandler;
                this.actionHandlers[name] = { action, schema };
                this.on(name, async (data: any) => {
                    const maybeFunction = this.actionHandlers[name] ? this.actionHandlers[name].action : null;
                    if (!maybeFunction) {
                        console.error(`No action handler found for: ${name}`);
                        return
                    }
                    if((emojis as any)[name]) process.stdout.write((emojis as any)[name].emoji);
                    else process.stdout.write(name+'\n');
                    await maybeFunction(data, this.state, this);
                    if (this.actionHandlers[name].nextState) {
                        if(this.actionHandlers[name].delay) {
                            await delay(this.actionHandlers[name].delay);
                        }
                        await this.actionHandlers[this.actionHandlers[name].nextState].action(data, this.state, this);
                    }
                });
                console.log(`Loaded action handler: ${name}`);
            });
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
                if(message && message.length > 0) {
                    console.log(message);
                    this.chatMessages.push(message);
                    this.setState({ message });
                    return 'sent message';
                }
                else return 'no message to send! You should always provide a message to send to the user.';
            },
            nextState: null
        },
        "say-aloud": {
            schema: { type: "function", function: { name: 'say-aloud', description: 'say the text using text-to-speech', parameters: { "type": 'object', "properties": { "text": { "type": 'string', "description": 'the text to say' }, "voice": { "type": 'string', "description": 'the voice to use (can be \'male\' or \'female\'). If not specified, the default female voice will be used' } }, "required": ['text'] } } },
            action: async ({ text, voice }: any, state: any, api: any) => {
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
                let sentenceSplit = await api.callAPI('chat', 'completions', { body: { model: "gpt-3.5-turbo", response_format: { "type": "json_object" }, messages: [{ role: "system", content: `You transform some given content into sentence-long fragments meant to be delivered to a text-to-speech agent. 

**Output your results as a JSON object with the format { fragments: string[] } Output RAW JSON only**

This means you remove and rewrite content containing things like urls and file names so that they sound file when spoken. 

For example, when you see 'https://google.com/foo-2' you output something like, 'https colon slash slash google dot com slash foo dash two'

When creating your fragments, you should break fragments up by sentence if possible. Don't break up the sentence in places where having it in two fragments would sound weird.

**Output your results as a JSON object with the format { fragments: string[] } Output RAW JSON only**` }, { role: "user", content: text }] } });
                sentenceSplit = JSON.parse(sentenceSplit.choices[0].message.content);
                const sentences = sentenceSplit.fragments;
                // split the text into sentences
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
            schema: { type: 'function', function: { name: 'get-file-tree', description: 'Get the file tree of the directory at the given path', parameters: { type: 'object', properties: { path: { type: 'string', description: 'The path of the directory to explore' }, n: { type: 'integer', description: 'The depth of the directory tree to explore' } } } } },
            action: async ({ path, n }: any) => {
                try {
                    const cwd = process.cwd();
                    const pathModule = require('path');
                    const thePath = path.slice(0, 1) === '/' ? path : pathModule.join(cwd, (path || ''));
                    const dirTree = require("directory-tree");
                    const tree = dirTree(thePath, { depth: n });
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
        "cwd": {
            schema: { type: 'function', function: { name: 'cwd', description: 'Get or set the current working directory. Call with no parameters to get the current working directory. Call with the full path of a directory to set the cwd to that directory. You are returned the new cwd', parameters: { type: 'object', properties: { path: { type: 'string', description: 'The path of the directory to set the cwd to' } } } } },
            action: async function (params: any) {
                if(params.path) {
                    const pathModule = require('path');
                    let path = params.path.slice(0, 1) === '/' ? params.path : pathModule.join(process.cwd(), params.path);
                    process.chdir(path);
                    return process.cwd();
                } else {
                    return process.cwd();
                }
            },
        },
        "clear-state": {
            action: async (params: any, state: any, api: any) => {
                this.state = {};
            },
            nextState: 'state-cleared'
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
        "state-cleared": {
            action: async () => {},
            nextState: null
        },
        "tasks-set": {
            schema: { type: 'function', function: { name: 'tasks-set', description: 'Set a list of tasks that you will then be managed through. Pass it an array of tasks to get started.', parameters: { type: 'object', properties: { tasks: { type: 'array', description: 'The tasks to set', items: { type: 'string' } } }, required: ['tasks'] } } },
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
                function evalInContext(context: any) {
                    return (function() { eval(code) }).call(context);
                }
                return evalInContext({ ...globalThis, state, api });
            },
            nextState: null
        },
        "send-message": {
            action: async (
                { message, thread_id, assistant_id, requirements, percent_complete, status, tasks, current_task, notes }: any,
                { assistant, thread, run }: any, 
                api: any ) => {

                // create our input frame
                const inputFrame = {
                    chat: message, requirements, percent_complete, status, tasks, current_task, notes
                }
                // create or load the assistant
                if(assistant_id) {
                    assistant = await api.callAPI('assistants', 'retrieve', { assistant_id });
                } else {
                    assistant = await api.callAPI('assistants', 'create', {
                        body: {
                            instructions: this.prompt,
                            model: 'gpt-4-turbo-preview',
                            name: 'assistant',
                            tools: api.getSchemas()
                        }
                    });
                }
                assistant_id = assistant.id;
                api.setState({ assistant_id: assistant.id });

                // create or load the thread
                if (thread_id) {
                    thread = await api.callAPI('threads', 'retrieve', { thread_id });
                } else {
                    thread = await api.callAPI('threads', 'create', {});
                }
                thread_id = thread.id;
                api.setState({ thread_id: thread.id });

                // list existing runs, resume active runs, or create a new run
                const runs = await api.callAPI('runs', 'list', { thread_id: thread.id });
                if (runs && runs.data.length > 0) {
                    await Promise.all(runs.data.map(async (run: any) => {
                        if(run.status === 'active') {
                            return async () => api.emit('run-queued', { run });
                        } else {
                            return api.callAPI('runs', 'cancel', { thread_id: thread.id, run_id: run.id });
                        }
                    }));
                }

                // create a new run and message
                await api.callAPI('messages', 'create', {
                    thread_id: thread.id,
                    body: { role: 'user', content: JSON.stringify(inputFrame) }
                });
                run = await api.callAPI('runs', 'create', {
                    thread_id: thread.id,
                    body: { assistant_id: assistant.id }
                });
            },
            nextState: null
        },
        "runs-create": {
            schema: { type: 'function', function: { name: 'runs-create', description: 'Create a new run', parameters: { type: 'object', properties: { assistant_id: { type: 'string', description: 'The ID of the assistant to create the run for' }, thread_id: { type: 'string', description: 'The ID of the thread to create the run for' }, body: { type: 'object', description: 'The run object to create' } }, required: ['assistant_id', 'thread_id'] } } },
            action: async ({ run }: any, state: any, api: any) => {
                return await api.callSync('run-queued', { run });
            },
            nextState: null
        },
        "run-queued": {
            "action": async ({ run }: any, state:  any, api: any) => {
                if (!run) throw new Error('No run provided');
                run = await api.callAPI('runs', 'retrieve', { thread_id: run.thread_id, run_id: run.id }, 1000);
                this.emit(`run-${run.status}`, { run });
                return { run };
            },
            "nextState": null
        },
        "run-in_progress": {
            "action": async ({ run }: any, state: any, api: any) => {
                await this.callSync('run-queued', { run });
                return { run };
            },
            "nextState": null
        },
        "get-conversation-summary": {
            "schema": { "type": "function", "function": { "name": "get-conversation-summary", "description": "Get a summary of the conversation", "parameters": { "type": "object", "properties": { "thread_id": { "type": "string", "description": "The ID of the thread to get the conversation summary for" }, "conversation_summary": { "type": "string", "description": "The existing conversation summary to incorporate updates to" } }, "required": ["thread_id"] } } },
            "action": async ({ thread_id }: any, { conversation_summary }: any, api: any) => {
                // first we query for all the messages in the thread - olest first
                const messages = await api.callAPI('messages', 'list', { thread_id, ordering: 'created_at' });
                // create a text output of the conversation - include the role, datetime, aaand the message
                const conversationSummary = messages.data.map((message: any) => `${message.role} - ${message.created_at} - ${message.content[0].text.value}`).join('\n');
                let prompt = `Here is a summary of the conversation: ${conversationSummary}`;
                if(conversation_summary) prompt += `\n\nHere is the existing summary for you to incorporate updates to.${conversation_summary}`;
                const summary = await api.callAPI('chats', 'completions', { messages: [
                    { role: 'system', content: `Given a conversation and optional conversational detailed summary, you output a new conversational summary that accounts for the entire conversation.\n\nWhenever possible you embed datetimes into the summary, alowing you to intelligently integrate chat fragments into your overall conversational summary\n\nOutput your summary in a timeline format so that the conversation can be followed in the summary.\n\nOutput your response as a JSON object with format { summary: string }`},
                    { role: 'user', content: prompt }
                ] });
                const response = summary.choices[0].message.content[0].text.value;
                this.setState({ conversation_summary: response });
                return response;
            },
            "nextState": null
        },
        "run-requires_action": {
            action: async ({ run }: any, { runs }: any, api: any) => {
                if (run.required_action.type === 'submit_tool_outputs') {
                    let tool_calls = await run.required_action;
                    tool_calls = tool_calls.submit_tool_outputs.tool_calls;
                    for (const tool_call of tool_calls) {
                        let func = this.actionHandlers[tool_call.function.name];
                        if (func) {
                            let result = await this.callSync(tool_call[tool_call.type].name, JSON.parse(tool_call[tool_call.type].arguments));
                            tool_call.output = result || 'undefined';
                        }
                        else {
                            tool_call.output = `Tool not found: ${tool_call.function.name}`;
                            const availableTools = this.getSchemas().map((schema: any) => schema.function.name);
                            tool_call.output += `\nAvailable tools: ${availableTools.join(', ')}`;
                        }
                    }
                    const toolOutputs = [];
                    for(const tool_call of tool_calls) {
                        toolOutputs.push({
                            tool_call_id: tool_call.id,
                            output: JSON.stringify(tool_call.output)
                        });
                    }
                    run.required_action = null;
                    this.setState({ runs: { [run.id]: run } });
                    if(toolOutputs.length > 0) {
                        await api.callAPI('runs', 'submit_tool_outputs', {
                            thread_id: run.thread_id, run_id: run.id, body: {
                                tool_outputs: toolOutputs,
                            }
                        });
                    }
                }
            },
            nextState: null
        },
        "runs-submit_tool_outputs": {
            action: async ({ run }: any, state: any, api: any) => {
                return this.emit('run-queued', { run }, 1000);
            },
            nextState: null
        },
        "run-completed": {
            action: async (
                { run }: any, 
                { chat, threads, thread, percent_complete }: any, 
                api: any
            ) => {
                const messages = await this.callAPI('messages', 'list', { thread_id: run.thread_id });
                if(messages && messages.data && messages.data.length > 0) {
                    const message = await this.callAPI('messages', 'retrieve', { thread_id: run.thread_id, message_id: messages.data[0].id });
                    let latest_message = message.content[0].text.value;
                    if (latest_message) {
                        latest_message = latest_message.replace(/\\n/g, '');
                        threads[run.thread_id].latest_message = latest_message || chat;
                        thread.latest_message = latest_message || chat;
                        this.setState({ 
                            threads: { [run.thread_id]: threads[run.thread_id] },
                            thread: thread,
                            runs: { [run.id]: {
                                latest_message,
                                id: run.id
                            } },
                        });
                        this.chatMessages.push(latest_message);
                    }
                }
                if(percent_complete && percent_complete < 100) {
                    return await api.emit('send-message', { 
                        assistant_id: run.assistant_id, 
                        thread_id: run.thread_id, 
                        percent_complete: percent_complete, 
                        status: 'in progress',
                    });
                } 
                else  api.emit('session-complete');
            },
            nextState: null
        },
        "speech-to-text": {
            schema: { type: 'function', function: { name: 'speech-to-text', description: 'Enable / disable speech to text. Call with no enabled parameter to get the enabled state. Call with an enabled value of true to enable automatic speech-to-text submission.', parameters: { type: 'object', properties: { enabled: { type: 'boolean', description: 'WHether to enable or disable speech-to-text' } } } } },
            action: async function ({ enabled }: any, run: any, api: any) {
                class SpeechToTextService {
                    api: any;
                    vad: any;
                    ort: any;
                    inst: any;
                    started: boolean = false;
                    constructor(api: any) {
                        this.api = api;
                        this.ort = require('onnxruntime-node');
                        this.vad = require('@ricky0123/vad-node');
                    }
                    async start() {
                        if(this.started) return;
                        this.started = true;
                        this.inst = await this.vad.MicVAD.new({
                            onSpeechStart: () => {
                              console.log("Speech start detected")
                            },
                            onSpeechEnd: async (audio: any) => {
                                function loadAudio(audioPath: string) {
                                    const wav = require("wav-decoder")
                                    let buffer = fs.readFileSync(audioPath)
                                    let result = wav.decode.sync(buffer)
                                    let audioData = new Float32Array(result.channelData[0].length)
                                    for (let i = 0; i < audioData.length; i++) {
                                      for (let j = 0; j < result.channelData.length; j++) {
                                        audioData[i] += result.channelData[j][i]
                                      }
                                    }
                                    return [audioData, result.sampleRate]
                                  }

                                // save the audio to a temporary file which we will pass to whisper
                                const fs = require('fs');
                                const path = require('path');
                                const whisper = require('whisper');
                                const tempPath = path.join(__dirname, 'temp.wav');
                                fs.writeFileSync(tempPath, audio);
                                console.log("Speech end detected")

                                // send the audio to whisper
                                const response = await whisper(tempPath); 
                                console.log(response);

                                // delete the temporary file
                                fs.unlinkSync(tempPath);
                            }
                          })
                          this.vad.start()
                    }
                    async stop() {
                        if(!this.started) return;
                        this.started = false;
                        this.vad.stop();
                    }
                }
                if(enabled) {
                    if(!api.services.speechToText) {
                        api.services.speechToText = new SpeechToTextService(this);
                        await api.services.speechToText.start();
                        console.log('speech to text started');
                    }
                } else {
                    if(api.services.speechToText) {
                        await api.services.speechToText.stop();
                        console.log('speech to text stopped');
                    }
                }
            }
        }
    }

    resolver: any = null;
    chatMessages: any = [];

    constructor(serverUrl = 'https://api.openai.com/v1/') {
        super();
        this.serverUrl = serverUrl || 'https://api.openai.com/v1/';
        this.model = 'gpt-4-turbo-preview';
        this.name = 'assistant';
        this.debug = false;
        this.loadActionHandlers();
        // tools are in ./tools
        const path = require('path');
        const toolsDir = path.join(__dirname, '..', 'tools');
        this.loadTools(toolsDir);
        this.on('session-complete', this.onMessage);
    }
    onMessage = (params: any, state: any, api: any) => {
        if(this.chatMessages) console.log(this.chatMessages);
        if(this.resolver) { 
            this.resolver({ messages: this.chatMessages });
            this.resolver = null;
        }
    }
    async chat(message: any) {
        this.chatMessages = [];
        return new Promise((resolve, reject) => {
            this.resolver = resolve;
            return this.emit('send-message',  {
                message,
                assistant_id: this.state.assistant_id,
                thread_id: this.state.thread_id,
                requirements: message,
                percent_complete: 0,
                status: 'in progress',
                tasks: [],
                current_task: '',
            });
        });
    }
}


