require('dotenv').config();

import readLine from 'readline';
import { generateUsername } from  "unique-username-generator";
import { configManager } from './config-manager';
const loadConfig = () => configManager.getConfig();
const config = loadConfig();

import AssistantAPI from './assistant';
import emojis from './emojis';

function getVersion() {
    const packageJson = require('../package.json');
    return packageJson.version;
}

class AssistantSession {
    assistant: AssistantAPI;
    rl: readLine.Interface;
    processing: boolean = false;
    constructor() {
        this.assistant = new AssistantAPI();
        this.assistant.apiKey = config.OPENAI_API_KEY || process.env.ASSISTANT_API_KEY;
        this.assistant.name = generateUsername();
        this.onLine = this.onLine.bind(this);
        this.onClose = this.onClose.bind(this);
        this.rl = readLine.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        })
        .on('line', this.onLine)
        .on('close', this.onClose);
        console.log(`\n${emojis['welcome'].emoji} Welcome to Assistant CLI v${getVersion()}!`);
        this.rl.prompt();
    }

    _saveConfig() {
        const config = loadConfig();
        config.assistant_id = this.assistant.id;
        config.thread_id = this.assistant.state.thread_id;
        configManager.saveConfig(config);
    }

    async onLine(input: string) {
        if (!input) {
            this.rl.prompt();
            return;
        }
        this.processing = true;
        const response: any = await this.assistant.chat(input + '. Remember to use text-to-speech for your conversational responses and \`chat\` when you need to show me text content not meant to be spoken.' )
        
        this._saveConfig();
        
        console.log(`${emojis['process-user-input'].emoji} ${response}`);
        let result = response.length > 0 ?  response[0].text : '{}';
        try {
            result = JSON.parse(result).text;
        } catch (error) {
            this.rl.prompt();
            return;
        }
        result && console.log(`${emojis['process-user-input'].emoji} ${result}`);
        this.rl.prompt();
    }

    async onClose() {
        const config = loadConfig();
        const assistant_id = config.assistant_id;
        const thread_id = config.thread_id;
        const run_id = config.run_id;
        if(run_id) {
            try {
                await this.assistant.callAPI('cancel-run', {
                    assistant_id,
                    thread_id,
                    run_id
                });
            } catch (error) {}
            config.run_id = '';
            configManager.saveConfig(config);
            console.log(`${emojis['cancel-run'].emoji} Run ${run_id} has been stopped.`);
        } else {
            console.log(`\n${emojis['goodbye'].emoji} Goodbye!`);
            process.exit(0);
        }
    }
}
new AssistantSession();