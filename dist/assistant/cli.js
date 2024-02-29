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
const assistant_1 = __importDefault(require("./assistant"));
const emojis = {
    'process-user-input': {
        'action': 'Add',
        'emoji': '🖊️' // Pen for adding new inputs
    },
    'start-run': {
        'action': 'Start',
        'emoji': '🚀' // Rocket for initiating or starting something
    },
    'update-run': {
        'action': 'Update/Refresh/Sync',
        'emoji': '🔄' // The existing refresh emoji is quite apt, but it stays for consistency
    },
    'cancel-run': {
        'action': 'Stop/Pause',
        'emoji': '🛑' // Stop sign for a clearer stop/pause action
    },
    'complete-run': {
        'action': 'Complete/Finish',
        'emoji': '🎉' // Party popper for celebrating completion
    },
    'incomplete-run': {
        'action': 'Incomplete/Unfinish',
        'emoji': '⚠️' // Warning sign to indicate something is incomplete or unfinished
    },
    'handle-run-action-required': {
        'action': 'Accept/Approve/Confirm',
        'emoji': '✔️' // Check mark for acceptance or approval
    },
    "show-message": {
        "action": "Read/View",
        "emoji": "👀" // Eyes for viewing or reading messages
    },
    "session-complete": {
        "action": "Complete/Finish",
        "emoji": "🏁" // Checkered flag for marking completion
    },
    submit_tool_outputs: {
        "action: ": "Submit",
        "emoji": "📤" // Outbox tray for submitting tool outputs
    },
    "assistant-input": {
        "action": "Add",
        "emoji": "✍️" // Writing hand for adding input
    },
    'runs-create': {
        'action': 'Create',
        'emoji': '🌟' // Sparkles for creation, indicating something new and shiny
    },
    'runs-queued': {
        'action': 'List/Display',
        'emoji': '🔍' // Magnifying glass for looking at a list or display
    },
    'cancel-active-run': {
        'action': 'Stop/Pause',
        'emoji': '✋' // Raised hand as a stop gesture
    },
    'run-expired': {
        'action': 'Stop/Pause',
        'emoji': '🕰️' // An old clock to indicate expiration or timeout
    },
    'run-requires-action': {
        'action': 'Accept/Approve/Confirm',
        'emoji': '📬' // Mailbox with flag up to indicate action is needed, like receiving mail
    },
    "idle": {
        "action": "Start",
        "emoji": "💤" // Zzz for idle, indicating readiness to wake up and start
    },
};
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});
const assistant = new assistant_1.default();
assistant.name = generateUsername();
rl.on('line', (input) => __awaiter(void 0, void 0, void 0, function* () {
    // if there's no input, prompt again
    if (!input) {
        rl.prompt();
        return;
    }
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
    result && console.log(`${emojis['process-user-input'].emoji} ${result}`);
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
        console.log(`${emojis['cancel-run'].emoji} Run ${run_id} has been stopped.`);
    }
}));
rl.prompt();
