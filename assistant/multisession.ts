import AssistantAPI from "./assistant";
import { configManager} from "./config-manager";
import path from 'path';
import emojis from './emo'
import prompt from './prompt';

import { generateUsername } from "unique-username-generator";
const highlight = require('cli-highlight').highlight;
const loadConfig = () => configManager.getConfig();

const readline = require('readline');
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

class TerminalSessionManager extends AssistantAPI {

    prompt = prompt;
    sessions: TerminalSession[];
    activeSessionIndex: number;
    readlineInterface:any;
    assistant: any;

    model = 'gpt-4-turbo-preview';
    name = 'assistant';
    
    actionHandlers: any = {...this.actionHandlers, ... {
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
        // ********** action handlers **********
        "run-completed": {
            action: async (
                { run, percent_complete: pc2 }: any, 
                { requirements, tasks, threads, percent_complete }: any, 
                session: any) => {

                const messages: any = await session.manager.callAPI('messages', 'list', { thread_id: run.thread_id });
                let latest_message = messages.data ? messages.data[0].content[0] : { text: { value: '' } };
                if (latest_message && latest_message.text) {
                    latest_message = latest_message.text.value;
                    latest_message = latest_message.replace(/\\n/g, '');
                    threads[run.thread_id].latest_message = latest_message;
                    session.manager.setState({ threads });
                    session.manager.emit('show-message', { message: latest_message });
                }
                console.log(highlight(latest_message, { language: 'markdown', ignoreIllegals: true }))
                if (percent_complete < 100 && requirements.length > 0) {
                    const action: any = {
                        requirements,
                        percent_complete: percent_complete + 1,
                        chat: 'Lets continue with the next task.'
                    }
                    session.manager.emit('assistant-input', action);
                } else {
                    session.manager.emit('session-complete', { run, latest_message });
                }

                this.readlineInterface.prompt();
            },
            nextState: null
        },
        "session-init": {
            action: async (
                { }: any, 
                { assistant, run, thread }: any, 
                session: any) => {
                const config = loadConfig();
                session.apiKey = config.apiKey || process.env.OPENAI_API_KEY;

                // thread
                if (config.thread_id) {
                    thread = await session.manager.callAPI('threads', 'retrieve', { thread_id: config.thread_id });
                } else {
                    thread = await session.manager.callAPI('threads', 'create', { body: {} });
                }

                // run
                if (config.run_id) {
                    const run = await session.manager.callAPI('runs', 'retrieve', { thread_id: thread.id, run_id: config.run_id });
                    // if the run is active, we keep the run in the state and we queue it
                    if (run.status === 'active' || run.status === 'requires_action') {
                        session.manager.setState({ run });
                        session.manager.emit('runs-queue', { run });
                    } else { await session.manager.callSync('runs-cancel', { run }); }
                }

                session.setState({
                    assistants: { [this.assistant.id]: this.assistant },
                    assistant: this.assistant,
                    threads: { [thread.id]: { thread, runs: {} } },
                    thread
                });
                const sessionInfo = { assistant, thread, run:  null }
                await session.callSync('session-start', sessionInfo);
            },
            nextState: null
        },
        "session-start": {
            action: async ({ thread }: any,  { assistant }: any, session: any) => {
                const config = configManager.loadConfig();
                config.assistant_id = assistant.id;
                config.thread_id = thread && thread.id;
                configManager.saveConfig(config);
                console.log(`Session started with assistant ${assistant.id}${thread ? ', thread ' + thread.id : ''}}`);
                this.readlineInterface.prompt()
            },
            nextState: null
        },
        "send-message": {
            action: async (
                { message, thread }: any, 
                { assistant, run, requirements, percent_complete = 0, status = 'in progress', tasks = [], current_task = '', chat = '' }: any, 
                session: any) => {
                const inputFrame = {
                    requirements: requirements ? requirements : message,
                    percent_complete,
                    status,
                    tasks,
                    current_task,
                    chat: requirements ? message : ''
                }
                if (!thread) {
                    thread = await session.manager.callAPI('threads', 'create', {
                        body: {}
                    });
                }
                // cancel any active runs
                let runs = await session.manager.callAPI('runs', 'list', { thread_id: thread.id });
                if (runs.data.length > 0) {
                    await Promise.all(runs.data.map(async (run: any) => {
                        if (run.status === 'active' || run.status === 'requires_action') {
                            await session.manager.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                        }
                    }));
                }
                // create a new message and run
                await session.manager.callAPI('messages', 'create', {
                    thread_id: thread.id,
                    body: { role: 'user', content: JSON.stringify(inputFrame) }
                });
                run = await session.manager.callAPI('runs', 'create', {
                    thread_id: thread.id,
                    body: { assistant_id: assistant.id }
                });
                session.setState({
                    threads: { [thread.id]: { thread, runs: { [run.id]: run }, run } },
                    thread,
                    runs: { [run.id]: run },
                    run
                });
                await session.manager.callSync('run-queued', { run });
            },
            nextState: null
        },
        "run-cancel": {
            action: async ({ run }: any, state: any, session: any) => {
                if (run.status === 'active' || run.status === 'requires_action') {
                    await session.manager.callAPI('runs', 'cancel', { thread_id: run.thread_id, run_id: run.id });
                }
                console.log(`Run ${run.id} cancelled`);
            },
            nextState: null
        },
        "runs-retrieve": {
            action: async ({ thread_id }: any, state: any, session: any) => {
                process.stdout.write(emojis['runs-queued'].emoji);
            },
            nextState: null
        },
        "update-config": {
            action: async (data: any, { assistant, thread, run, requirements, percent_complete, status, tasks, current_task }: any, session: any) => {
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
    } };

    schemas: any[] = [
        { type: 'function', function: { name: 'eval', description: 'Evaluate the given code and return the result', parameters: { type: 'object', properties: { code: { type: 'string', description: 'The code to evaluate' } }, required: ['code'] } } },
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

    sessionManager: any
    
    constructor() {
        super();
        this.sessions = [];
        this.activeSessionIndex = 0;
        this.name = generateUsername("", 2, 38);

        this.loadTools(__dirname)
        this.initAssistant().then((assistant: any) => {
            this.initializeReadline()
        });
    }

    async initAssistant() {
        const { schemas } = this.getTools();
        const config = configManager.loadConfig();
        if (config.assistant_id) {
            try {
                this.assistant = await this.callAPI('assistants', 'retrieve', { assistant_id: config.assistant_id });
            } catch (e) {
                console.log('Assistant not found. Creating a new assistant.');
                this.assistant = await this.callAPI('assistants', 'create', {
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
                this.assistant = await this.callAPI('assistants', 'create', {
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
        config.assistant_id = this.assistant.id;
        configManager.saveConfig(config);
        return this.assistant;
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
                    this.createNewSession(this);
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
        }).on('close', () => {
            console.log('Session closed');
            process.exit(0);
        });

        this.createNewSession(this); // Start with one session open
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

   async createNewSession(parent: TerminalSessionManager) {

        this.sessionManager = parent;

        const newSession = new TerminalSession(this);
        this.sessions.push(newSession);
        this.activeSessionIndex = this.sessions.length - 1;
        this.switchToSession(this.activeSessionIndex);

        if(!this.state.sessions) this.state.sessions = {};
        this.state.sessions[newSession.id] = newSession.getState();
        this.state.activeSessionIndex = this.activeSessionIndex;
        this.state.assistant = this.assistant;

        console.clear();

        newSession.setState(this.state.sessions[newSession.id]);

        this.emit('session-init', {
            assistant: this.assistant.id
        })
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

class TerminalSession {
    id: string = '';
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

    constructor(public manager: any) {
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
                this.manager[handler.handleType || 'on'](handlerName, async (data: any) => {
                    if (manager.assistant.beforeAction) await manager.assistant.beforeAction(handlerName, data, this.state, this);
                    await handler.action(data, this.state, this);
                    if (manager.assistant.afterAction) await manager.assistant.afterAction(handlerName, data, this.state, this);
                    if (handler.nextState) { manager.assistant.emit(handler.nextState, this.state); }
                }, this);
            }
            catch (error) {
                console.error(`Error setting up action handler: ${handlerName}`, error);
            }
        });
    }

    executeCommand(command: string) {
        this.history.push( command);
        this.manager.emit('send-message', {
            message: command,
            thread: (this.state as any).thread
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


    setState(newState: any) {
        this.state = { ...this.state, ...newState };
        this.manager.emit('state', this.state);
    }

    getState() { return JSON.parse(JSON.stringify(this.state)); }

    async callSync(handlerName: any, data: any) { return this.actionHandlers[handlerName].action(data, this.state); }
    
}
new TerminalSessionManager()
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
