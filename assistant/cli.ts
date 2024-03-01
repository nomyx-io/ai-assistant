require('dotenv').config();

const { generateUsername } = require( "unique-username-generator" );
const readline = require('readline');
const { configManager } = require('./config-manager');
const loadConfig = () => configManager.getConfig();
const config = loadConfig();

import AssistantAPI from './assistant';
import emojis from './emojis';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});

const assistant = new AssistantAPI();
assistant.apiKey = config.OPENAI_API_KEY || process.env.ASSISTANT_API_KEY;
assistant.name = generateUsername();
let processing = false;

rl.on('line', async (input: string) => {
    if(processing) return;
    if (!input) {
        rl.prompt();
        return;
    }
    processing = true;

    const response: any = await assistant.chat(input + '. Remember to use text-to-speech for your conversational responses and \`chat\` when you need to show me text content not meant to be spoken.')
    const config = loadConfig();
    config.assistant_id = assistant.id;
    config.thread_id = assistant.state.thread_id;
    configManager.saveConfig(config);

    let result = response.length > 0 ?  response[0].text : '{}';
    try {
        result = JSON.parse(result).text;
    } catch (error) {
        rl.prompt();
        return;
    }
    processing = false;
    result && console.log(`${emojis['process-user-input'].emoji} ${result}`);
    rl.prompt();
}).on('close', async () => {
    const config = loadConfig();
    const assistant_id = config.assistant_id;
    const thread_id = config.thread_id;
    const run_id = config.run_id;
    if(run_id) {
        await assistant.callAPI('cancel-run', {
            assistant_id,
            thread_id,
            run_id
        });
        config.run_id = '';
        configManager.saveConfig(config);
        processing = false;
        console.log(`${emojis['cancel-run'].emoji} Run ${run_id} has been stopped.`);
    } else {
        console.log(`\n${emojis['goodbye'].emoji} Goodbye!`);
        process.exit(0);
    }
});
rl.prompt();