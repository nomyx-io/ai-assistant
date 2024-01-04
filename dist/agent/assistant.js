"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPersona = exports.loadNewPersona = exports.Run = exports.Assistant = exports.Thread = exports.Message = exports.OpenAIFile = void 0;
require('dotenv').config();
var openai_1 = require("openai");
var File = require('openai').File;
var fs_1 = __importDefault(require("fs"));
var OpenAIFile = /** @class */ (function () {
    function OpenAIFile() {
    }
    // The File class manages files uploaded to the OpenAI API
    OpenAIFile.prototype.create = function (file) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.files.create(__assign({}, file))];
                    case 1:
                        response = _a.sent();
                        this.data = response;
                        return [2 /*return*/, this];
                }
            });
        });
    };
    OpenAIFile.prototype.retrieve = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.files.retrieve(id)];
                    case 1:
                        response = _a.sent();
                        this.data = response;
                        return [2 /*return*/, this];
                }
            });
        });
    };
    OpenAIFile.prototype.delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.files.del(id)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(OpenAIFile.prototype, "id", {
        get: function () { return this.data.id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(OpenAIFile.prototype, "bytes", {
        get: function () { return this.data.bytes; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(OpenAIFile.prototype, "createdAt", {
        get: function () { return this.data.created_at; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(OpenAIFile.prototype, "filename", {
        get: function () { return this.data.filename; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(OpenAIFile.prototype, "object", {
        get: function () { return this.data.object; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(OpenAIFile.prototype, "purpose", {
        get: function () { return this.data.purpose; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(OpenAIFile.prototype, "status", {
        get: function () { return this.data.status; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(OpenAIFile.prototype, "statusDetails", {
        get: function () { return this.data.status_details; },
        enumerable: false,
        configurable: true
    });
    return OpenAIFile;
}());
exports.OpenAIFile = OpenAIFile;
var Message = /** @class */ (function () {
    function Message(data) {
        this.data = data;
    }
    Message.prototype.create = function (threadId, role, content) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.messages.create(threadId, {
                            "role": role,
                            "content": content
                        })];
                    case 1:
                        response = _a.sent();
                        this.data = response;
                        return [2 /*return*/, this];
                }
            });
        });
    };
    Message.prototype.retrieve = function (threadId, messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.messages.retrieve(threadId, messageId)];
                    case 1:
                        response = _a.sent();
                        this.data = response;
                        return [2 /*return*/, this];
                }
            });
        });
    };
    Message.prototype.delete = function (threadId, messageId, role) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    Object.defineProperty(Message.prototype, "id", {
        get: function () { return this.data.id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Message.prototype, "object", {
        get: function () { return this.data.object; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Message.prototype, "createdAt", {
        get: function () { return this.data.created_at; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Message.prototype, "threadId", {
        get: function () { return this.data.thread_id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Message.prototype, "role", {
        get: function () { return this.data.role; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Message.prototype, "content", {
        get: function () { return this.data.content; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Message.prototype, "assistantId", {
        get: function () { return this.data.assistant_id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Message.prototype, "runId", {
        get: function () { return this.data.run_id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Message.prototype, "fileIds", {
        get: function () { return this.data.file_ids; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Message.prototype, "metadata", {
        get: function () { return this.data.metadata; },
        enumerable: false,
        configurable: true
    });
    return Message;
}());
exports.Message = Message;
var Thread = /** @class */ (function () {
    function Thread(data) {
        // if this is an integer then it's the thread id
        if (typeof data === "string") {
            this.retrieve(data);
        }
        else {
            this.data = data;
        }
        this.create = this.create.bind(this);
        this.retrieve = this.retrieve.bind(this);
        this.delete = this.delete.bind(this);
        this.listMessages = this.listMessages.bind(this);
        this.addMessage = this.addMessage.bind(this);
        this.deleteMessage = this.deleteMessage.bind(this);
    }
    // The Thread class manages thread operations in the OpenAI API
    Thread.prototype.create = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.create({})];
                    case 1:
                        response = _a.sent();
                        this.data = response;
                        return [2 /*return*/, this];
                }
            });
        });
    };
    Thread.prototype.retrieve = function (threadId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.retrieve(threadId)];
                    case 1:
                        response = _a.sent();
                        this.data = response;
                        return [2 /*return*/, this];
                }
            });
        });
    };
    Thread.prototype.delete = function (threadId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.del(threadId)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Thread.prototype.listMessages = function (threadId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.messages.list(threadId)];
                    case 1:
                        response = _a.sent();
                        // Assuming you want to wrap each message data in a Message instance
                        return [2 /*return*/, response.data.map(function (msgData) { return new Message(msgData); })];
                }
            });
        });
    };
    Thread.prototype.addMessage = function (threadId, role, content) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.messages.create(threadId, {
                            "role": role,
                            "content": content
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, new Message(response)];
                }
            });
        });
    };
    Thread.prototype.deleteMessage = function (threadId, messageId, role) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (role === "user") {
                    throw new Error("Cannot delete user messages.");
                }
                return [2 /*return*/];
            });
        });
    };
    Thread.get = function (threadId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.retrieve(threadId)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, new Thread(response)];
                }
            });
        });
    };
    Thread.create = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.create({})];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, new Thread(response)];
                }
            });
        });
    };
    Object.defineProperty(Thread.prototype, "id", {
        get: function () { return this.data.id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Thread.prototype, "object", {
        get: function () { return this.data.object; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Thread.prototype, "createdAt", {
        get: function () { return this.data.created_at; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Thread.prototype, "metadata", {
        get: function () { return this.data.metadata; },
        enumerable: false,
        configurable: true
    });
    return Thread;
}());
exports.Thread = Thread;
var Assistant = /** @class */ (function () {
    function Assistant(data, thread, apikey) {
        if (thread === void 0) { thread = null; }
        this.cancelling = false;
        this.data = data;
        this.thread = thread;
        this._run = null;
        this.runId = '';
        this.latestMessage = '';
        this.onUpdate = function (_1, _2) { };
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.getMessages = this.getMessages.bind(this);
        this.run = this.run.bind(this);
        this.cancel = this.cancel.bind(this);
        Assistant.client = new openai_1.OpenAI({
            apiKey: apikey,
        });
    }
    Assistant.list = function (apiKey) {
        return __awaiter(this, void 0, void 0, function () {
            var ret;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        Assistant.client = new openai_1.OpenAI({
                            apiKey: apiKey,
                        });
                        return [4 /*yield*/, Assistant.client.beta.assistants.list()];
                    case 1:
                        ret = _a.sent();
                        return [2 /*return*/, ret.data.map(function (a) { return new Assistant(a, undefined, apiKey); })];
                }
            });
        });
    };
    Assistant.create = function (name, instructions, tools, model, threadId) {
        if (threadId === void 0) { threadId = null; }
        return __awaiter(this, void 0, void 0, function () {
            var ret, thread;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.assistants.create({
                            instructions: instructions,
                            name: name,
                            tools: tools,
                            model: model
                        })];
                    case 1:
                        ret = _a.sent();
                        if (!threadId) return [3 /*break*/, 3];
                        return [4 /*yield*/, Assistant.client.beta.threads.retrieve(threadId)];
                    case 2:
                        thread = _a.sent();
                        return [2 /*return*/, new Assistant(ret, thread, Assistant.client.apiKey)];
                    case 3: return [2 /*return*/, new Assistant(ret, undefined, Assistant.client.apiKey)];
                }
            });
        });
    };
    Assistant.get = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var ret;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.assistants.retrieve(id)];
                    case 1:
                        ret = _a.sent();
                        return [2 /*return*/, new Assistant(ret, undefined, Assistant.client.apiKey)];
                }
            });
        });
    };
    Assistant.prototype.update = function (name, instructions, tools, model) {
        return __awaiter(this, void 0, void 0, function () {
            var ret;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.assistants.update(this.id, {
                            instructions: instructions,
                            name: name,
                            tools: tools,
                            model: model
                        })];
                    case 1:
                        ret = _a.sent();
                        this.data = ret;
                        return [2 /*return*/, this];
                }
            });
        });
    };
    Assistant.prototype.delete = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.assistants.del(this.id)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Object.defineProperty(Assistant.prototype, "id", {
        get: function () { return this.data.id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Assistant.prototype, "name", {
        get: function () { return this.data.name; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Assistant.prototype, "instructions", {
        get: function () { return this.data.instructions; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Assistant.prototype, "tools", {
        get: function () { return this.data.tools; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Assistant.prototype, "model", {
        get: function () { return this.data.model; },
        enumerable: false,
        configurable: true
    });
    Assistant.prototype.getMessages = function (threadId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.messages.list(threadId)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data.map(function (msgData) { return new Message(msgData); })];
                }
            });
        });
    };
    Assistant.prototype.run = function (query, availableFunctions, tools, apiKey, onUpdate) {
        if (availableFunctions === void 0) { availableFunctions = {}; }
        if (tools === void 0) { tools = this.tools; }
        return __awaiter(this, void 0, void 0, function () {
            var thread_1, _a, threadId, _b, getLatestMessage, _loop_1, this_1, state_1, e_1;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.onUpdate = onUpdate;
                        if (!Assistant.client) {
                            Assistant.client = new openai_1.OpenAI({
                                apiKey: apiKey
                            });
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 9, , 10]);
                        _a = this.thread;
                        if (_a) return [3 /*break*/, 3];
                        return [4 /*yield*/, Assistant.client.beta.threads.create()];
                    case 2:
                        _a = (_c.sent());
                        _c.label = 3;
                    case 3:
                        thread_1 = _a;
                        this.thread = thread_1;
                        threadId = this.thread ? this.thread.id : null;
                        if (!threadId)
                            throw new Error("Thread not found");
                        this.onUpdate && this.onUpdate("creating thread", this.thread);
                        return [4 /*yield*/, Assistant.client.beta.threads.messages.create(thread_1.id, {
                                role: "user", content: query
                            })];
                    case 4:
                        _c.sent();
                        this.onUpdate && this.onUpdate("creating message", query);
                        _b = this;
                        return [4 /*yield*/, Assistant.client.beta.threads.runs.create(thread_1.id, {
                                assistant_id: this.id
                            })];
                    case 5:
                        _b._run = _c.sent();
                        this.onUpdate && this.onUpdate("created run", this._run);
                        getLatestMessage = function () { return __awaiter(_this, void 0, void 0, function () {
                            var messages;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.messages.list(thread_1.id)];
                                    case 1:
                                        messages = _a.sent();
                                        this.onUpdate && this.onUpdate("getting messages", messages.data[0].content[0].text.value);
                                        return [2 /*return*/, messages.data[0].content[0].text.value];
                                }
                            });
                        }); };
                        _loop_1 = function () {
                            var messageTime, waitTime_1, _d, cnt;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        this_1.runId = this_1._run ? this_1._run.id : null;
                                        return [4 /*yield*/, Assistant.client.beta.threads.runs.retrieve(thread_1.id, this_1.runId)];
                                    case 1:
                                        this_1._run = _e.sent();
                                        this_1.runId = this_1._run.id;
                                        this_1.onUpdate && this_1.onUpdate("retrieving run", this_1._run);
                                        if (!(this_1._run && this_1._run.status === "failed")) return [3 /*break*/, 6];
                                        if (!(this_1._run.last_error === 'rate limit exceeded')) return [3 /*break*/, 3];
                                        messageTime = this_1._run.last_error.match(/in (\d+)m(\d+).(\d+)s/);
                                        if (!messageTime) return [3 /*break*/, 3];
                                        waitTime_1 = (parseInt(messageTime[1]) * 60 + parseInt(messageTime[2]) + 1) * 1000;
                                        this_1.onUpdate && this_1.onUpdate("rate limit exceeded", waitTime_1);
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, waitTime_1); })];
                                    case 2:
                                        _e.sent();
                                        return [2 /*return*/, "continue"];
                                    case 3:
                                        _d = 'failed run: ' + this_1._run.last_error;
                                        if (_d) return [3 /*break*/, 5];
                                        return [4 /*yield*/, getLatestMessage()];
                                    case 4:
                                        _d = (_e.sent());
                                        _e.label = 5;
                                    case 5:
                                        this_1.latestMessage = _d || '\n';
                                        this_1.onUpdate && this_1.onUpdate("failed run", this_1.latestMessage);
                                        return [2 /*return*/, "break"];
                                    case 6:
                                        if (this_1.cancelling === true && this_1.runId && this_1.thread) {
                                            this_1.onUpdate && this_1.onUpdate("cancelling run", this_1.runId);
                                            this_1.cancel();
                                            this_1.latestMessage = 'cancelled run';
                                            this_1.onUpdate && this_1.onUpdate("cancelled run", this_1.latestMessage);
                                            return [2 /*return*/, "break"];
                                        }
                                        if (!(this_1._run && this_1._run.status === "completed")) return [3 /*break*/, 8];
                                        return [4 /*yield*/, getLatestMessage()];
                                    case 7:
                                        this_1.latestMessage = (_e.sent()) || '\n';
                                        this_1.onUpdate && this_1.onUpdate("completed run", this_1.latestMessage);
                                        return [2 /*return*/, "break"];
                                    case 8:
                                        if (this_1._run && this_1._run.status === "cancelled") {
                                            this_1.latestMessage = 'cancelled run';
                                            this_1.onUpdate && this_1.onUpdate("cancelled run", this_1.latestMessage);
                                            return [2 /*return*/, "break"];
                                        }
                                        cnt = 0;
                                        _e.label = 9;
                                    case 9:
                                        if (!(this_1._run && this_1._run.status === "queued" || this_1._run && this_1._run.status === "in_progress")) return [3 /*break*/, 12];
                                        return [4 /*yield*/, Assistant.client.beta.threads.runs.retrieve(thread_1.id, this_1._run.id)];
                                    case 10:
                                        this_1._run = _e.sent();
                                        this_1.onUpdate && this_1.onUpdate("update run status ".concat(++cnt), this_1._run);
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                                    case 11:
                                        _e.sent(); // Polling delay
                                        return [3 /*break*/, 9];
                                    case 12:
                                        if (!(this_1._run && this_1._run.status === "requires_action")) return [3 /*break*/, 15];
                                        this_1.toolCalls = this_1._run.required_action.submit_tool_outputs.tool_calls;
                                        return [4 /*yield*/, this_1.execTools(this_1.toolCalls, availableFunctions, onUpdate)];
                                    case 13:
                                        this_1.toolOutputs = _e.sent();
                                        this_1.onUpdate && this_1.onUpdate("executing tools", this_1.toolOutputs);
                                        return [4 /*yield*/, Assistant.client.beta.threads.runs.submitToolOutputs(thread_1.id, this_1._run.id, { tool_outputs: this_1.toolOutputs })];
                                    case 14:
                                        _e.sent();
                                        this_1.onUpdate && this_1.onUpdate("submitting tool outputs", this_1.toolOutputs);
                                        _e.label = 15;
                                    case 15: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _c.label = 6;
                    case 6:
                        if (!true) return [3 /*break*/, 8];
                        return [5 /*yield**/, _loop_1()];
                    case 7:
                        state_1 = _c.sent();
                        if (state_1 === "break")
                            return [3 /*break*/, 8];
                        return [3 /*break*/, 6];
                    case 8: return [2 /*return*/, this.latestMessage];
                    case 9:
                        e_1 = _c.sent();
                        console.error(e_1);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    Assistant.prototype.execTools = function (toolCalls, availableFunctions, onUpdate) {
        return __awaiter(this, void 0, void 0, function () {
            var toolOutputs, _onUpdate, _i, toolCalls_1, toolCall, func, _arguments, result, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toolOutputs = [];
                        _onUpdate = onUpdate ? onUpdate : this.onUpdate;
                        _i = 0, toolCalls_1 = toolCalls;
                        _a.label = 1;
                    case 1:
                        if (!(_i < toolCalls_1.length)) return [3 /*break*/, 6];
                        toolCall = toolCalls_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        func = availableFunctions[toolCall.function.name];
                        if (!func) {
                            throw new Error("Function ".concat(toolCall.function.name, " is not available."));
                        }
                        _arguments = JSON.parse(toolCall.function.arguments);
                        return [4 /*yield*/, func(_arguments, this)];
                    case 3:
                        result = _a.sent();
                        _onUpdate && _onUpdate("executed tool " + toolCall.function.name, result);
                        toolOutputs.push({
                            tool_call_id: toolCall.id,
                            output: result
                        });
                        return [3 /*break*/, 5];
                    case 4:
                        e_2 = _a.sent();
                        _onUpdate && _onUpdate("error", e_2);
                        toolOutputs.push({
                            tool_call_id: toolCall.id,
                            output: 'error: ' + e_2.message
                        });
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, toolOutputs];
                }
            });
        });
    };
    Assistant.prototype.cancel = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.thread) {
                            this.cancelling = true;
                            return [2 /*return*/];
                        }
                        if (!this.runId) {
                            this.cancelling = true;
                            return [2 /*return*/];
                        }
                        this.cancelling = false;
                        return [4 /*yield*/, Assistant.client.beta.threads.runs.cancel(this.thread.id, this.runId)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Assistant.prototype.listFiles = function () {
        return Assistant.client.beta.assistants.files.list(this.id);
    };
    Assistant.prototype.attachFile = function (path) {
        try {
            return Assistant.client.files.create({
                file: fs_1.default.createReadStream(path),
                purpose: 'assistants'
            });
        }
        catch (e) {
            return null;
        }
    };
    return Assistant;
}());
exports.Assistant = Assistant;
var Run = /** @class */ (function () {
    function Run(data) {
        this.data = data;
        this._steps = [];
        this._messages = [];
        this.last_error = '';
        this.updateStatus = this.updateStatus.bind(this);
        this.getMessages = this.getMessages.bind(this);
        this.execTools = this.execTools.bind(this);
        this.submitToolOutputs = this.submitToolOutputs.bind(this);
        this.cancel = this.cancel.bind(this);
    }
    Run.get = function (threadId, runId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.runs.retrieve(threadId, runId)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, new Run(response)];
                }
            });
        });
    };
    Run.prototype.updateStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var runStatus, stepStatus;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.runs.retrieve(this.data.thread_id, this.data.id)];
                    case 1:
                        runStatus = _a.sent();
                        this.data = runStatus;
                        return [4 /*yield*/, Assistant.client.beta.threads.runs.steps.list(this.data.thread_id, this.data.id)];
                    case 2:
                        stepStatus = _a.sent();
                        this._steps = stepStatus;
                        return [2 /*return*/, this];
                }
            });
        });
    };
    Run.prototype.getMessages = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Assistant.client.beta.threads.messages.list(this.data.thread_id)];
                    case 1:
                        response = _a.sent();
                        this._messages = response;
                        return [2 /*return*/, this._messages.map(function (m) { return new Message(m); })];
                }
            });
        });
    };
    Run.prototype.execTools = function (toolCalls, availableFunctions) {
        return __awaiter(this, void 0, void 0, function () {
            var toolOutputs, _i, toolCalls_2, toolCall, toolFunction, toolOutput;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        toolOutputs = [];
                        _i = 0, toolCalls_2 = toolCalls;
                        _a.label = 1;
                    case 1:
                        if (!(_i < toolCalls_2.length)) return [3 /*break*/, 4];
                        toolCall = toolCalls_2[_i];
                        toolFunction = availableFunctions[toolCall.function.name];
                        if (!toolFunction) {
                            throw new Error("Function ".concat(toolCall.function.name, " not found in available functions."));
                        }
                        return [4 /*yield*/, toolFunction(toolCall.function.arguments)];
                    case 2:
                        toolOutput = _a.sent();
                        toolOutputs.push({
                            tool_call_id: toolCall.id,
                            output: toolOutput
                        });
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, toolOutputs];
                }
            });
        });
    };
    Run.prototype.submitToolOutputs = function (toolOutputs) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Assistant.client.beta.threads.runs.submitToolOutputs(this.data.thread_id, this.data.id, {
                        tool_outputs: toolOutputs
                    })];
            });
        });
    };
    Run.prototype.cancel = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Assistant.client.beta.threads.runs.cancel(this.data.thread_id, this.data.id)];
            });
        });
    };
    Object.defineProperty(Run.prototype, "assistantId", {
        get: function () { return this.data.assistant_id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "cancelledAt", {
        get: function () { return this.data.cancelled_at; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "completedAt", {
        get: function () { return this.data.completed_at; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "createdAt", {
        get: function () { return this.data.created_at; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "expiresAt", {
        get: function () { return this.data.expires_at; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "failedAt", {
        get: function () { return this.data.failed_at; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "fileIds", {
        get: function () { return this.data.file_ids; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "id", {
        get: function () { return this.data.id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "instructions", {
        get: function () { return this.data.instructions; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "lastError", {
        get: function () { return this.data.last_error; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "metadata", {
        get: function () { return this.data.metadata; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "model", {
        get: function () { return this.data.model; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "object", {
        get: function () { return this.data.object; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "requiredAction", {
        get: function () { return this.data.required_action; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "startedAt", {
        get: function () { return this.data.started_at; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "status", {
        get: function () { return this.data.status; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "threadId", {
        get: function () { return this.data.thread_id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "steps", {
        get: function () { return this._steps; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Run.prototype, "messages", {
        get: function () { return this._messages; },
        enumerable: false,
        configurable: true
    });
    return Run;
}());
exports.Run = Run;
var newPersonaScript = function (tools) { return "*** You are a responsive and advanced AI assistant with a constantly expanding set of capabilities. ***\n1. Initialize user_input with actual user input.\n2. RETRIEVE AND EXAMINE YOUR LIST OF LEARNED SKILLS and your list of tools.\n   4.1. Tools are external functions provided by the user. The full list of tools is:\n   ".concat(tools, "\n   Please note that you are running on ").concat(process.platform, ".\n   4.2 Skills are learned functions that you have stored from previous interactions. You can retrieve the list of skills with the list_learned_skills tool.\n3. Determine and store the difficulty of the task derived from user_input.\n4. If the task difficulty is less than medium:\n   4.1. Perform the task with the available tools.\n   4.2. End the process.\n5. If the task is medium or above:\n   5.1. Attempt to find a learned skill appropriate for the user_input.\n   5.2. If such a skill exists:\n       5.2.1. Notify the user that the skill will be used.\n       5.2.2. Execute the task using the skill and tools. Store the performance outcome.\n       5.2.3. If the performance is unsatisfactory, improve the skill with the outcome used as feedback and update the learned skills repository.\n   5.3. If no skill is found:\n       5.3.1. Notify the user of the absence of an appropriate skill.\n       5.3.2. Create a new skill based on user_input.\n       5.3.3. Execute the task with the new skill and tools. Store the performance outcome.\n       5.3.4. If the performance is unsatisfactory, improve the newly generated skill with the outcome and update the learned skills repository.\n       \n** ALWAYS DOUBLE-CHECK YOUR FILE UPDATES BY VISUALLY INSPECTING THE FILE CONTENTS AFTER EACH UPDATE **\n** ALWAYS PLAN OUT COMPLEX TASKS BEFORE EXECUTING THEM BY OUTPUTTING THE STEPS TO THE SCREEN **\n** YOU MUST BE PROACTIVE IN IDENTIFYING NEW SKILLS AND UPDATING EXISTING SKILLS. THIS IS CRITICAL **\n"); };
function getTools(schemas) {
    var out = [];
    for (var i = 0; i < schemas.length; i++) {
        var tool = schemas[i].function;
        if (Object.keys(tool).length === 0) {
            continue;
        }
        var tool_name = tool.name;
        var description = tool.description;
        var tool_description = "\"".concat(tool_name, " - ").concat(description, "\"");
        out.push(tool_description);
    }
    return out.join(",\n") + '\n';
}
function loadNewPersona(schemas) {
    return __awaiter(this, void 0, void 0, function () {
        var tools_str;
        return __generator(this, function (_a) {
            tools_str = getTools(schemas);
            return [2 /*return*/, newPersonaScript(tools_str)];
        });
    });
}
exports.loadNewPersona = loadNewPersona;
function loadPersona(schemas) {
    return __awaiter(this, void 0, void 0, function () {
        var persona_out, i, tool, tool_name, description, tool_description;
        return __generator(this, function (_a) {
            persona_out = ["*** You are a responsive and advanced AI assistant with a constantly expanding set of capabilities. ***\n\n1. **Check for Existing Skills**: At the start of interaction, the assistant should list its skills to see if a suitable one is available for the user's request.\n2. **Use of Existing Skills**: If an appropriate skill exists, the assistant should prioritize using that skill to handle the task efficiently.\n3. **Learn and Save New Skills**: If a new skill is learned during the interaction, the assistant should detail the steps taken and save the new skill for future use.\n\n*** Your capabilities include ***:"];
            for (i = 0; i < schemas.length; i++) {
                tool = schemas[i].function;
                if (Object.keys(tool).length === 0) {
                    continue;
                }
                tool_name = tool.name;
                description = tool.descriptionc;
                tool_description = "- You can ".concat(description, " using the ").concat(tool_name, " function.");
                persona_out.push(tool_description);
            }
            persona_out.push("1** To handle a request **:\n\n1. Identify if an existing skill you possess matches the user's request.\n2. If a matching skill is found, apply it to complete the task.\n3. If no skill matches, approach the task innovatively and learn from the experience. ** DISPLAY REGULAR UPDATES TO THE USER **\n4. Once the task is completed, if this is a new skill, save it for future use.\n5. If the skill already exists, update it with any new information learned.\n6. Provide a summary of actions taken and any skills learned or updated.\n\nYOU ** MUST ** FOLLOW THIS FLOWCHART TO COMPLETE THE TASK.\n\ngraph TB\n    A[Start] --> B{Get existing skills<br><br>skills = getExistingSkills()}\n    B --> C[Set skills<br><br>skills = returned list]\n    C --> D[Set flag<br><br>newSkillLearned = false]\n\n    E[Get request<br><br>request = getUserRequest()] --> F{Skill match?<br><br>matchedSkill = findMatching<br>Skill(request, skills)}\n    F -- Yes --> G[Do task<br><br>doTask(matchedSkill)] --> M[Show summary<br><br>displaySummary(taskExecution, matchedSkill)]\n    F -- No --> H[Learn new skill<br><br>newSkill = learnNewSkill(request)]\n    H --> I[Set flag<br><br>newSkillLearned = true]  \n    \n    G --> J{Check flag<br><br>If newSkillLearned:}\n    H --> J\n    \n    J -- Yes --> K[Save new skill<br><br>saveLearnedSkill(newSkill)]\n    J -- Yes --> L[Update existing<br><br>updateExistingSkills(newSkill)]\n    J -- No --> M[Show summary<br><br>displaySummary(skills, newSkill)]\n    \n    L --> M\n    K --> M\n    \n    M --> N[End]\n\nYour home folder is ".concat(process.cwd(), " and you are running on ").concat(process.platform, ".\n\n## Displaying updates\n\nAs you run, you can display updates to the user by using the displayCode and \ndisplayMarkdown functions. Use these functions to display the code and markdown\noutputs of your intermediate steps.\n\n** ALWAYS FORMAT ALL OUTPUT INCLUDING CHAT MESSAGES USING MARKDOWN **\n\n"));
            return [2 /*return*/, persona_out.join("\n") + '\n'];
        });
    });
}
exports.loadPersona = loadPersona;
module.exports = { Assistant: Assistant, Run: Run, Thread: Thread, Message: Message, File: File, loadPersona: loadPersona, loadNewPersona: loadNewPersona };
