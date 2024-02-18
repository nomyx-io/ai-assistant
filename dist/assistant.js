"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
require("dotenv/config");
var events_1 = require("events");
var node_fetch_1 = __importDefault(require("node-fetch"));
var url_1 = require("url");
var delay = function (ms) { return new Promise(function (resolve) { return setTimeout(resolve, ms); }); };
var AssistantAPI = /** @class */ (function (_super) {
    __extends(AssistantAPI, _super);
    function AssistantAPI(serverUrl) {
        if (serverUrl === void 0) { serverUrl = 'https://api.openai.com/v1/'; }
        var _this = _super.call(this) || this;
        _this.prompt = "You are a helpful. highly-skilled assistant enabled with a number of powerful tools.\n# Application State\nYou are enabled with a persistent application state that you can use to store and retrieve information across multiple interactions.\n- use the 'state' function to get or set a named variable's value\n# Tasks\nYou can define a list of tasks that you want to accomplish and then advance through them one at a time.\n- use the 'set_tasks' function to set the tasks to the given tasks. This will set the current task to the first task in the list as well as set the percent_complete to 0\n- use the 'advance_task' function to advance the current task to the next task. This will automatically set the percent_complete to the appropriate value, which you should adjust if necessary. Once you have completed the last task, the percent_complete will be set to 100 and the status will be set to 'complete'\n# State Variables\nThe following state variables are available to you throughout your session:\n- 'requirements': the requirements that you are currently working on\n- 'current_task': the current task that you are working on\n- 'percent_complete': the percentage of the overall requirements that you have completed\n- 'status': the status of the current session. This can be 'incomplete', or 'complete'\n- 'chat': the latest chat message that you have received or sent\n- 'notes': any notes that you have taken during the session\nYou can add any other state variables that you need to manage your session.\n# Output\nSet the 'chat' state variable to the message that you want to display to the user. This will be displayed in the chat window.\nOutput your primary response as a JSON object with the following structure:\n{\n  \"requirements\": \"the requirements that you are currently working on\",\n  \"percent_complete\": 0,\n  \"status\": \"incomplete\",\n  \"tasks\": [],\n  \"current_task\": \"the current task that you are working on\",\n  \"notes\": \"any notes that you have taken during the session\",\n  \"chat\": \"the latest chat message that you have received or sent\"\n}\nALWAYS utput RAW JSON - NO surrounding codeblocks.\n"; // state
        _this.state = {
            requirements: 'no requirements set',
            percent_complete: 0,
            status: 'idle',
            tasks: [],
            current_task: '',
            notes: 'no AI notes.',
            chat: 'no chat messages'
        };
        _this.model = 'gpt-4-turbo-preview';
        _this.name = 'Assistant';
        _this.debug = true;
        _this.actionHandlers = {
            "runs-create": {
                "action": function (data, state) { return _this.callAPI('runs', 'retrieve', {
                    thread_id: _this.state.thread.id, run_id: state.run.id
                }); }, "nextState": null,
            },
            "runs-retrieve": {
                "action": function (data, state) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        this.setState({ run_status: data.status, run: data });
                        return [2 /*return*/];
                    });
                }); }, "nextState": null
            },
            "run-queued": {
                "action": function (data, state) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        if (data.status === 'completed') {
                            this.emit('run-completed', { run: data });
                        }
                        else if (data.status === 'failed')
                            this.emit('run-failed', { run: data });
                        else if (data.status === 'cancelled')
                            this.emit('run-cancelled', { run: data });
                        else if (data.status === 'requires_action')
                            this.emit('run-requires-action', { run: data });
                        else
                            this.waitThenEmit('run-queued', { run: data }, 1000);
                        return [2 /*return*/];
                    });
                }); }, "nextState": null
            },
            "runs-list_run_steps": {
                "action": function (data, state) { return __awaiter(_this, void 0, void 0, function () {
                    var retrievePromises, _i, data_1, step, results, run_steps;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                retrievePromises = [];
                                for (_i = 0, data_1 = data; _i < data_1.length; _i++) {
                                    step = data_1[_i];
                                    retrievePromises.push(this.callAPI('runs', 'retrieve_step', {
                                        thread_id: this.state.thread.id,
                                        run_id: this.state.run.id,
                                        step_id: step.id
                                    }));
                                }
                                return [4 /*yield*/, Promise.all(retrievePromises)];
                            case 1:
                                results = _a.sent();
                                run_steps = results.reduce(function (acc, result) {
                                    acc[result.id] = result;
                                    return acc;
                                }, {});
                                this.setState(__assign({}, run_steps));
                                return [2 /*return*/];
                        }
                    });
                }); }, "nextState": null
            },
            "retrieve-latest-message": {
                "action": function (data, state) { return __awaiter(_this, void 0, void 0, function () {
                    var messages, latest_message, messages, latest_message;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!(state.thread && state.thread.id)) return [3 /*break*/, 2];
                                return [4 /*yield*/, this.callAPI('threads', 'list_messages', { thread_id: state.thread.id })];
                            case 1:
                                messages = _a.sent();
                                latest_message = messages.data ? messages.data[0].content[0].text.value : '';
                                latest_message = latest_message.replace(/\\n/g, '');
                                this.setState({ latest_message: latest_message });
                                this.emit('display-message', { message: latest_message });
                                return [3 /*break*/, 4];
                            case 2:
                                if (!(state.run && state.run.id)) return [3 /*break*/, 4];
                                return [4 /*yield*/, this.callAPI('runs', 'list_messages', { run_id: state.run.id })];
                            case 3:
                                messages = _a.sent();
                                latest_message = messages.data ? messages.data[0].content[0].text.value : '';
                                latest_message = latest_message.replace(/\\n/g, '');
                                this.setState({ latest_message: latest_message });
                                this.emit('display-message', { message: latest_message });
                                _a.label = 4;
                            case 4: return [2 /*return*/];
                        }
                    });
                }); },
                "nextState": null
            },
            "display-message": {
                "action": function (data, state) {
                    _this.setState({ latest_message: data });
                    try {
                        console.log(state.latest_message);
                    }
                    catch (error) {
                    }
                },
                "nextState": null
            },
            "assistant-input": {
                action: function (data, state) { return __awaiter(_this, void 0, void 0, function () {
                    var inputFrame, assistant, run, _a;
                    var _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                inputFrame = {
                                    requirements: data,
                                    percent_complete: 0,
                                    status: "incomplete",
                                    chat: data
                                };
                                return [4 /*yield*/, this.callAPI('assistants', 'create', { body: {
                                            instructions: this.prompt,
                                            model: this.model,
                                            name: this.name,
                                            tools: this.schemas
                                        } })];
                            case 1:
                                assistant = _c.sent();
                                return [4 /*yield*/, this.callAPI('runs', 'create_thread_and_run', { body: {
                                            assistant_id: assistant.id,
                                            thread: {
                                                messages: [{ role: 'user', content: JSON.stringify(inputFrame) }]
                                            }
                                        }
                                    })];
                            case 2:
                                run = _c.sent();
                                _a = this.setState;
                                _b = {
                                    assistant: assistant
                                };
                                return [4 /*yield*/, this.callAPI('threads', 'retrieve', { thread_id: run.thread_id })];
                            case 3:
                                _a.apply(this, [(_b.thread = _c.sent(),
                                        _b.run = run,
                                        _b)]);
                                this.waitThenEmit('run-loop', { run: run }, 1000);
                                return [2 /*return*/];
                        }
                    });
                }); },
                nextState: null
            },
            "run-loop": {
                action: function (data, state) { return __awaiter(_this, void 0, void 0, function () {
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _a = state;
                                return [4 /*yield*/, this.callAPI('runs', 'retrieve', { thread_id: this.state.thread.id, run_id: this.state.run.id }, 1000)];
                            case 1:
                                _a.run = _b.sent();
                                state[state.run.id] = state.run;
                                this.setState(state);
                                switch (state.run.status) {
                                    case 'completed':
                                        this.runActionHandler('run-completed', { run: state.run });
                                        break;
                                    case 'failed':
                                        this.runActionHandler('run-failed', { run: state.run });
                                        break;
                                    case 'cancelled':
                                        this.runActionHandler('run-cancelled', { run: state.run });
                                        break;
                                    case 'requires_action':
                                        this.runActionHandler('run-requires-action', { run: state.run });
                                        break;
                                    default:
                                        this.waitThenEmit('run-loop', { run: state.run }, 1000);
                                        break;
                                }
                                return [2 /*return*/];
                        }
                    });
                }); },
                nextState: null
            },
            "run-requires-action": {
                action: function (data, state) { return __awaiter(_this, void 0, void 0, function () {
                    var tool_calls;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, data.run.required_action];
                            case 1:
                                tool_calls = _a.sent();
                                tool_calls = tool_calls.submit_tool_outputs.tool_calls;
                                if (tool_calls.length > 0) {
                                    this.setState({
                                        tool_calls: tool_calls,
                                        run: data.run,
                                        run_id: data.run.id,
                                        thread_id: data.run.thread_id
                                    });
                                    this.runActionHandler('execute-tools', { tool_calls: tool_calls, run: data.run });
                                }
                                return [2 /*return*/];
                        }
                    });
                }); },
                nextState: null
            },
            "execute-tools": {
                action: function (data, state) { return __awaiter(_this, void 0, void 0, function () {
                    var tool_calls, toolOutputs, _i, tool_calls_1, tool_call, func, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                tool_calls = data.tool_calls;
                                toolOutputs = [];
                                _i = 0, tool_calls_1 = tool_calls;
                                _a.label = 1;
                            case 1:
                                if (!(_i < tool_calls_1.length)) return [3 /*break*/, 4];
                                tool_call = tool_calls_1[_i];
                                func = this.tools[tool_call[tool_call.type].name];
                                if (!func) return [3 /*break*/, 3];
                                return [4 /*yield*/, func(JSON.parse(tool_call[tool_call.type].arguments), state)];
                            case 2:
                                result = _a.sent();
                                tool_call.output = result || 'undefined';
                                toolOutputs.push({
                                    tool_call_id: tool_call.id,
                                    output: tool_call.output
                                });
                                _a.label = 3;
                            case 3:
                                _i++;
                                return [3 /*break*/, 1];
                            case 4: return [4 /*yield*/, this.callAPI('runs', 'submit_tool_outputs', { thread_id: state.thread.id, run_id: state.run.id, body: {
                                        tool_outputs: toolOutputs,
                                    } })];
                            case 5:
                                _a.sent();
                                this.setState({ tool_calls: [] });
                                this.runActionHandler('run-loop', { run: state.run });
                                return [2 /*return*/];
                        }
                    });
                }); },
                nextState: null
            },
            "run-completed": {
                action: function (data, state) {
                    _this.setStatusThenEmit('retrieve-latest-message', { run: data }, 'complete');
                },
                nextState: null
            },
            "run-failed": {
                action: function (data, state) {
                    _this.setStatusThenEmit('retrieve-latest-message', { run: data }, 'failed');
                },
                nextState: null
            },
            "run-cancelled": {
                action: function (data, state) {
                    _this.setStatusThenEmit('retrieve-latest-message', { run: data }, 'cancelled');
                },
                nextState: null
            },
            "cleanup-old": {
                action: function (data, state) { return __awaiter(_this, void 0, void 0, function () {
                    var assistants, delCount;
                    var _this = this;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callAPI('assistants', 'list')];
                            case 1:
                                assistants = _a.sent();
                                assistants = assistants.find(function (assistant) { return assistant.name === _this.name; });
                                if (!(assistants.length > 0)) return [3 /*break*/, 3];
                                delCount = assistants.length;
                                return [4 /*yield*/, Promise.all(assistants.map(function (assistant) { return _this.callAPI('assistants', 'delete', { assistant_id: assistant.id }); }))];
                            case 2:
                                _a.sent();
                                console.log("deleted ".concat(delCount, " assistants"));
                                _a.label = 3;
                            case 3: return [2 /*return*/];
                        }
                    });
                }); },
                nextState: null
            }
        };
        _this.tools = {
            state: function (_a, state) {
                var name = _a.name, value = _a.value;
                var out;
                if (!value) {
                    out = state[name] ? state[name] instanceof Object ? JSON.stringify(state[name]) : state[name] : 'undefined';
                }
                else {
                    state[name] = value;
                    out = "".concat(name, " => ").concat(JSON.stringify(state[name]));
                    _this.setState(state);
                }
                return out || 'undefined';
            },
            states: function (_a, state) {
                var values = _a.values;
                var results = [];
                var setStateFunction = this.tools.state;
                for (var name_1 in values) {
                    results.push(setStateFunction({ name: name_1, value: values[name_1] }, state));
                }
                return results.join('\n') || 'undefined';
            },
            advance_task: function (_, state) {
                if (state.tasks.length === 0) {
                    return 'no more tasks';
                }
                else {
                    state.tasks.shift();
                    state.current_task = state.tasks[0];
                    state.percent_complete += state.percent_per_task;
                    console.log('task advanced to:' + state.current_task);
                    return state.current_task;
                }
            },
            set_tasks: function (_a, state) {
                var tasks = _a.tasks;
                state.tasks = tasks;
                state.current_task = tasks[0];
                state.percent_complete = 0;
                state.percent_per_task = 100 / tasks.length;
                return JSON.stringify(state.tasks);
            },
        };
        _this.schemas = [
            { type: 'function', function: { name: 'state', description: 'Get or set a named variable\'s value. Call with no value to get the current value. Call with a value to set the variable', parameters: { type: 'object', properties: { name: { type: 'string', description: 'The variable\'s name. required' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } } },
            { type: 'function', function: { name: 'advance_task', description: 'Advance the current task to the next task' } },
            { type: 'function', function: { name: 'set_tasks', description: 'Set the tasks to the given tasks. Also sets the current task to the first task in the list', parameters: { type: 'object', properties: { tasks: { type: 'array', description: 'The tasks to set', items: { type: 'string' } } }, required: ['tasks'] } } },
        ];
        _this.serverUrl = serverUrl;
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set.');
        }
        _this.setupActionHandlers();
        _this.callAPI = _this.callAPI.bind(_this);
        return _this;
    }
    AssistantAPI.prototype.setState = function (newState) {
        if (typeof newState === 'string') {
            try {
                var oState = newState = JSON.parse(newState);
                this.state = __assign(__assign({}, this.state), oState);
            }
            catch (error) {
                console.error(error);
            }
        }
        else {
            this.state = __assign(__assign({}, this.state), newState);
        }
        this.emit('state-changed', this.state);
    };
    AssistantAPI.prototype.getState = function () { return JSON.parse(JSON.stringify(this.state)); };
    // Improved callAPI method with refined error handling and retry logic
    AssistantAPI.prototype.callAPI = function (type, api, params, callDelay, retries, retryDelay) {
        if (params === void 0) { params = {}; }
        if (callDelay === void 0) { callDelay = 0; }
        if (retries === void 0) { retries = 3; }
        if (retryDelay === void 0) { retryDelay = 1000; }
        return __awaiter(this, void 0, void 0, function () {
            var def, func, method, path, url, reqData, response, r, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        def = this.apisDefinition({
                            // Corrected from assistant_.d to assistant_id
                            assistant_id: params.assistant_id,
                            thread_id: params.thread_id,
                            run_id: params.run_id,
                            message_id: params.message_id,
                            file_id: params.fileId,
                            step_id: params.stepId,
                            body: params.body
                        });
                        func = def[type][api];
                        method = Object.keys(func)[0];
                        path = func[method].join('/');
                        url = new url_1.URL(path, this.serverUrl);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 8, , 12]);
                        if (this.debug) {
                            console.log(type, api);
                        }
                        if (!(callDelay > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, delay(callDelay)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        reqData = {
                            method: method.toUpperCase(),
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": "Bearer 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",
                                "OpenAI-Beta": "assistants=v1"
                            },
                            body: JSON.stringify(params.body)
                        };
                        return [4 /*yield*/, (0, node_fetch_1.default)(url, reqData)];
                    case 4:
                        response = _a.sent();
                        if (!response.ok) return [3 /*break*/, 6];
                        return [4 /*yield*/, response.json()];
                    case 5:
                        r = _a.sent();
                        if (r.id) {
                            if (!this.state[type])
                                this.state[type] = {};
                            this.state[type][r.id] = r;
                            this.state[type.slice(0, -1)] = r;
                        }
                        this.emit("".concat(type, "-").concat(api), response);
                        return [2 /*return*/, r];
                    case 6:
                        console.error("".concat(response.status, ": ").concat(response.statusText));
                        console.error("".concat(type, "-").concat(api), response);
                        throw new Error("".concat(response.status, ": ").concat(response.statusText));
                    case 7: return [3 /*break*/, 12];
                    case 8:
                        error_1 = _a.sent();
                        if (!(retries > 0 && [429, 503].includes(error_1.status))) return [3 /*break*/, 10];
                        console.warn("Request failed, retrying after ".concat(retryDelay, "ms..."), error_1);
                        return [4 /*yield*/, delay(retryDelay)];
                    case 9:
                        _a.sent();
                        return [2 /*return*/, this.callAPI(type, api, params, retries - 1, 0, retryDelay * 2)];
                    case 10:
                        this.emit('api-error', { error: error_1, type: type, api: api });
                        throw error_1;
                    case 11: return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    AssistantAPI.prototype.apisDefinition = function (state) {
        function get(api) { return { 'get': api }; }
        function post(api, body) {
            if (body === void 0) { body = {}; }
            return { 'post': api, 'body': body };
        }
        function put(api, body) {
            if (body === void 0) { body = {}; }
            return { 'put': api, 'body': body };
        }
        function del(api) { return { 'delete': api }; }
        return {
            'assistants': {
                'list': get(['assistants']),
                'create': post(['assistants']),
                'retrieve': get(['assistants', state.assistant_id]),
                'modify': put(['assistants', state.assistant_id], state.body),
                'delete': del(['assistants', state.assistant_id]),
            },
            'threads': {
                'list_messages': get(['threads', state.thread_id, 'messages']),
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
                'create_thread_and_run': post(['threads', 'runs'], state),
                'submit_tool_outputs': post(['threads', state.thread_id, 'runs', state.run_id, 'submit_tool_outputs'], state.body),
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
        };
    };
    AssistantAPI.prototype.waitThenEmit = function (event, data, delay) {
        var _this = this;
        setTimeout(function () { return _this.emit(event, data); }, delay);
    };
    AssistantAPI.prototype.setStatusThenEmit = function (event, data, status) {
        this.setState({
            run: data,
            status: status
        });
        this.emit(event, { run: data });
    };
    AssistantAPI.prototype.setupActionHandler = function (handlerName, action, nextState) {
        var _this = this;
        this.actionHandlers[handlerName] = { action: action, nextState: nextState };
        this.on(handlerName, function (data) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log(handlerName);
                        return [4 /*yield*/, action(data, this.state)];
                    case 1:
                        _a.sent();
                        if (nextState) {
                            this.emit(nextState, this.state);
                        }
                        return [2 /*return*/];
                }
            });
        }); });
    };
    AssistantAPI.prototype.setupActionHandlers = function () {
        var _this = this;
        Object.entries(this.actionHandlers).forEach(function (_a) {
            var handlerName = _a[0], handler = _a[1];
            _this.setupActionHandler(handlerName, handler.action, handler.nextState);
        });
    };
    AssistantAPI.prototype.runActionHandler = function (handlerName, data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.emit(handlerName, data);
                return [2 /*return*/];
            });
        });
    };
    return AssistantAPI;
}(events_1.EventEmitter));
exports.default = AssistantAPI;
//# sourceMappingURL=assistant.js.map