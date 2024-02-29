"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emojis = {
    'process-user-input': {
        'action': 'Add',
        'emoji': '🖊️' // Pen for adding new inputs
    },
    'runs-create': {
        'action': 'Start',
        'emoji': '\n🚀\n' // Rocket for initiating or starting something
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
        "emoji": "\n👀\n" // Eyes for viewing or reading messages
    },
    "chat": {
        "action": "Read/View",
        "emoji": "\n👀\n" // Eyes for viewing or reading messages
    },
    "session-complete": {
        "action": "Complete/Finish",
        "emoji": "\n🏁\n" // Checkered flag for marking completion
    },
    "runs-submit_tool_outputs": {
        "action: ": "Submit",
        "emoji": "\n📤\n" // Outbox tray for submitting tool outputs
    },
    "assistant-input": {
        "action": "Add",
        "emoji": "✍️" // Writing hand for adding input
    },
    'run-queued': {
        'action': 'List/Display',
        'emoji': '🔍' // Magnifying glass for looking at a list or display
    },
    'cancel-active-run': {
        'action': 'Stop/Pause',
        'emoji': '✋' // Raised hand as a stop gesture
    },
    "run-in_progress": {
        "action": "Start",
        // Flying saucer for initiating or starting something
        "emoji": "🛸"
    },
    'run-expired': {
        'action': 'Stop/Pause',
        'emoji': '🕰️' // An old clock to indicate expiration or timeout
    },
    "run-completed": {
        "action": "Complete/Finish",
        "emoji": "\n🏁\n" // Checkered flag for marking completion
    },
    'run-requires_action': {
        'action': 'Accept/Approve/Confirm',
        'emoji': '\n📬\n' // Mailbox with flag up to indicate action is needed, like receiving mail
    },
    "idle": {
        "action": "Start",
        "emoji": "💤" // Zzz for idle, indicating readiness to wake up and start
    },
    "send-message": {
        "action": "Send",
        "emoji": "\n📧\n" // Envelope for sending messages
    }
};
exports.default = emojis;
