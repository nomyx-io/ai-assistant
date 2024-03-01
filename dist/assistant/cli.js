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
const { generateUsername } = require("unique-username-generator");
const readline = require('readline');
const { configManager } = require('./config-manager');
const loadConfig = () => configManager.getConfig();
const config = loadConfig();
const assistant_1 = __importDefault(require("./assistant"));
const emojis_1 = __importDefault(require("./emojis"));
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});
const assistant = new assistant_1.default();
assistant.apiKey = config.OPENAI_API_KEY || process.env.ASSISTANT_API_KEY;
assistant.name = generateUsername();
let processing = false;
rl.on('line', (input) => __awaiter(void 0, void 0, void 0, function* () {
    if (processing)
        return;
    if (!input) {
        rl.prompt();
        return;
    }
    processing = true;
    const response = yield assistant.chat(input + '. Remember to use text-to-speech for your conversational responses and \`chat\` when you need to show me text content not meant to be spoken.');
    const config = loadConfig();
    config.assistant_id = assistant.id;
    config.thread_id = assistant.state.thread_id;
    configManager.saveConfig(config);
    let result = response.length > 0 ? response[0].text : '{}';
    try {
        result = JSON.parse(result).text;
    }
    catch (error) {
        rl.prompt();
        return;
    }
    processing = false;
    result && console.log(`${emojis_1.default['process-user-input'].emoji} ${result}`);
    rl.prompt();
})).on('close', () => __awaiter(void 0, void 0, void 0, function* () {
    const config = loadConfig();
    const assistant_id = config.assistant_id;
    const thread_id = config.thread_id;
    const run_id = config.run_id;
    if (run_id) {
        yield assistant.callAPI('cancel-run', {
            assistant_id,
            thread_id,
            run_id
        });
        config.run_id = '';
        configManager.saveConfig(config);
        processing = false;
        console.log(`${emojis_1.default['cancel-run'].emoji} Run ${run_id} has been stopped.`);
    }
    else {
        console.log(`\n${emojis_1.default['goodbye'].emoji} Goodbye!`);
        process.exit(0);
    }
}));
rl.prompt();
