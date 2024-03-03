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
const readline_1 = __importDefault(require("readline"));
const unique_username_generator_1 = require("unique-username-generator");
const config_manager_1 = require("./config-manager");
const loadConfig = () => config_manager_1.configManager.getConfig();
const config = loadConfig();
const assistant_1 = __importDefault(require("./assistant"));
const emojis_1 = __importDefault(require("./emojis"));
function getVersion() {
    const packageJson = require('../package.json');
    return packageJson.version;
}
class AssistantSession {
    constructor() {
        this.processing = false;
        this.assistant = new assistant_1.default();
        this.assistant.apiKey = config.OPENAI_API_KEY || process.env.ASSISTANT_API_KEY;
        this.assistant.name = (0, unique_username_generator_1.generateUsername)();
        this.onLine = this.onLine.bind(this);
        this.onClose = this.onClose.bind(this);
        this.rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        })
            .on('line', this.onLine)
            .on('close', this.onClose);
        console.log(`\n${emojis_1.default['welcome'].emoji} Welcome to Assistant CLI v${getVersion()}!`);
        this.rl.prompt();
    }
    _saveConfig() {
        const config = loadConfig();
        config.assistant_id = this.assistant.id;
        config.thread_id = this.assistant.state.thread_id;
        config_manager_1.configManager.saveConfig(config);
    }
    onLine(input) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!input) {
                this.rl.prompt();
                return;
            }
            this.processing = true;
            const response = yield this.assistant.chat(input + '. Remember to use text-to-speech for your conversational responses and \`chat\` when you need to show me text content not meant to be spoken.');
            this._saveConfig();
            console.log(`${emojis_1.default['process-user-input'].emoji} ${response}`);
            let result = response.length > 0 ? response[0].text : '{}';
            try {
                result = JSON.parse(result).text;
            }
            catch (error) {
                this.rl.prompt();
                return;
            }
            result && console.log(`${emojis_1.default['process-user-input'].emoji} ${result}`);
            this.rl.prompt();
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            const config = loadConfig();
            const assistant_id = config.assistant_id;
            const thread_id = config.thread_id;
            const run_id = config.run_id;
            if (run_id) {
                try {
                    yield this.assistant.callAPI('cancel-run', {
                        assistant_id,
                        thread_id,
                        run_id
                    });
                }
                catch (error) { }
                config.run_id = '';
                config_manager_1.configManager.saveConfig(config);
                console.log(`${emojis_1.default['cancel-run'].emoji} Run ${run_id} has been stopped.`);
            }
            else {
                console.log(`\n${emojis_1.default['goodbye'].emoji} Goodbye!`);
                process.exit(0);
            }
        });
    }
}
new AssistantSession();
