require('dotenv').config();

import { OpenAI } from 'openai';
const File = require('openai').File;
import fs from 'fs';


export class OpenAIFile {
    data: any;
    // The File class manages files uploaded to the OpenAI API
    async create(file: any) {
        const response = await Assistant.client.files.create({ ...file });
        this.data = response;
        return this;
    }

    async retrieve(id: string) {
        const response = await Assistant.client.files.retrieve(id);
        this.data = response;
        return this;
    }

    async delete(id: string) {
        await Assistant.client.files.del(id);
    }

    get id() { return this.data.id; }
    get bytes() { return this.data.bytes; }
    get createdAt() { return this.data.created_at; }
    get filename() { return this.data.filename; }
    get object() { return this.data.object; }
    get purpose() { return this.data.purpose; }
    get status() { return this.data.status; }
    get statusDetails() { return this.data.status_details; }
}

export class Message {
    data: any;
    constructor(data: any) {
        this.data = data;
    }
    async create(threadId: string, role: string, content: string) {
        const response = await Assistant.client.beta.threads.messages.create(threadId, {
            "role": role as any,
            "content": content
        });
        this.data = response;
        return this;
    }

    async retrieve(threadId: string, messageId: string) {
        const response = await Assistant.client.beta.threads.messages.retrieve(threadId, messageId);
        this.data = response;
        return this;
    }

    async delete(threadId: string, messageId: string, role: string) {
        // if (role === "user") {
        //     throw new Error("Cannot delete user messages.");
        // }
        // await client.beta.threads.messages.del(threadId, messageId);
    }

    get id() { return this.data.id; }
    get object() { return this.data.object; }
    get createdAt() { return this.data.created_at; }
    get threadId() { return this.data.thread_id; }
    get role() { return this.data.role; }
    get content() { return this.data.content; }
    get assistantId() { return this.data.assistant_id; }
    get runId() { return this.data.run_id; }
    get fileIds() { return this.data.file_ids; }
    get metadata() { return this.data.metadata; }

}

export class Thread {
    data: any;
    constructor(data: any) {
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
    async create() {
        const response = await Assistant.client.beta.threads.create({});
        this.data = response;
        return this;
    }

    async retrieve(threadId: string) {
        const response = await Assistant.client.beta.threads.retrieve(threadId);
        this.data = response;
        return this;
    }

    async delete(threadId: string) {
        await Assistant.client.beta.threads.del(threadId);
    }

    async listMessages(threadId: string) {
        const response = await Assistant.client.beta.threads.messages.list(threadId);
        // Assuming you want to wrap each message data in a Message instance
        return response.data.map((msgData: any) => new Message(msgData));
    }

    async addMessage(threadId: string, role: string, content: string) {
        const response = await Assistant.client.beta.threads.messages.create(threadId, {
            "role": role as any,
            "content": content
        });
        return new Message(response);
    }

    async deleteMessage(threadId: string, messageId: string, role: string) {
        if (role === "user") {
            throw new Error("Cannot delete user messages.");
        }
        // await client.beta.threads.messages.del(threadId, messageId);
    }

    static async get(threadId: string) {
        const response = await Assistant.client.beta.threads.retrieve(threadId);
        return new Thread(response);
    }

    static async create() {
        const response = await Assistant.client.beta.threads.create({});
        return new Thread(response);
    }

    get id() { return this.data.id; }
    get object() { return this.data.object; }
    get createdAt() { return this.data.created_at; }
    get metadata() { return this.data.metadata; }
}

export class Assistant {
    data: any;
    thread: any;
    _run: any;
    runId: string;
    latestMessage: string;
    toolCalls: any;
    toolOutputs: any;
    cancelling = false;
    static client: any;
    onUpdate: (event: string, data: any) => void;
    constructor(data: any, thread: any = null, apikey: string) {
        this.data = data;
        this.thread = thread;
        this._run = null;
        this.runId = '';
        this.latestMessage = '';
        this.onUpdate = (_1,_2) => {};

        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.getMessages = this.getMessages.bind(this);
        this.run = this.run.bind(this);
        this.cancel = this.cancel.bind(this);
        Assistant.client = new OpenAI({
            apiKey:apikey,
        });
    }

    static async list(apiKey: string) {
        Assistant.client = new OpenAI({
            apiKey: apiKey,
        });
        const ret = await Assistant.client.beta.assistants.list();
        return ret.data.map((a: any) => new Assistant(a, undefined, apiKey));
    }

    static async create(name: string, instructions: string, tools: any, model: string, threadId = null) {
        const ret = await  Assistant.client.beta.assistants.create({
            instructions: instructions,
            name: name,
            tools: tools,
            model: model
        });
        if (threadId) {
            const thread = await  Assistant.client.beta.threads.retrieve(threadId);
            return new Assistant(ret, thread, Assistant.client.apiKey);
        }
        return new Assistant(ret, undefined, Assistant.client.apiKey);
    }

    static async get(id: string) {
        const ret = await Assistant.client.beta.assistants.retrieve(id);
        return new Assistant(ret, undefined, Assistant.client.apiKey);
    }

    async update(name: string, instructions: string, tools: any, model: string) {
        const ret = await Assistant.client.beta.assistants.update(this.id, {
            instructions: instructions,
            name: name,
            tools: tools,
            model: model
        });
        this.data = ret;
        return this;
    }

    async delete() {
        return await Assistant.client.beta.assistants.del(this.id);
    }

    get id() { return this.data.id; }
    get name() { return this.data.name; }
    get instructions() { return this.data.instructions; }
    get tools() { return this.data.tools; }
    get model() { return this.data.model; }

    async getMessages(threadId: string) {
        const response = await Assistant.client.beta.threads.messages.list(threadId);
        return response.data.map((msgData: any) => new Message(msgData));
    }
    
    async run(query: string, availableFunctions = {}, tools = this.tools, apiKey: string, onUpdate: (event: string, data: any) => void) {
        this.onUpdate = onUpdate;
        if(!Assistant.client) {
            Assistant.client = new OpenAI({
                apiKey: apiKey
            });
        }
        try {
            const thread = this.thread || await Assistant.client.beta.threads.create();
            this.thread = thread;
            const threadId = this.thread ? this.thread.id : null;
            if(!threadId) throw new Error("Thread not found");

            this.onUpdate && this.onUpdate("creating thread", this.thread);

            await Assistant.client.beta.threads.messages.create(thread.id, {
                role: "user", content: query });
            this.onUpdate && this.onUpdate("creating message", query);
            
            this._run = await Assistant.client.beta.threads.runs.create(thread.id, {
                assistant_id: this.id
            });
            this.onUpdate && this.onUpdate("created run", this._run);

            const getLatestMessage = async () => {
                const messages = await Assistant.client.beta.threads.messages.list(thread.id);
                this.onUpdate && this.onUpdate("getting messages", (messages.data[0].content[0] as any).text.value);
                return (messages.data[0].content[0] as any).text.value;
            }

            while(true) {
                this.runId = this._run ? this._run.id : null;
                this._run = await Assistant.client.beta.threads.runs.retrieve(thread.id, this.runId);
                this.runId = this._run.id;
                this.onUpdate && this.onUpdate("retrieving run", this._run);

                if(this._run && this._run.status === "failed") {
                    if(this._run.last_error === 'rate limit exceeded') {
                        // please try again in 2m54.355s. Visit
                        const messageTime = this._run.last_error.match(/in (\d+)m(\d+).(\d+)s/);
                        if(messageTime) {
                            const waitTime = (parseInt(messageTime[1]) * 60 + parseInt(messageTime[2]) + 1) * 1000;
                            this.onUpdate && this.onUpdate("rate limit exceeded", waitTime);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                            continue;
                        }
                    }
                    this.latestMessage = 'failed run: ' + this._run.last_error || await getLatestMessage() || '\n';
                    this.onUpdate && this.onUpdate("failed run", this.latestMessage);
                    break;
                }
                if(this.cancelling === true && this.runId && this.thread) {
                    this.onUpdate && this.onUpdate("cancelling run", this.runId);
                    this.cancel();
                    this.latestMessage = 'cancelled run';
                    this.onUpdate && this.onUpdate("cancelled run", this.latestMessage);
                    break;
                }
                if(this._run && this._run.status === "completed") {
                    this.latestMessage = await getLatestMessage() || '\n';
                    this.onUpdate && this.onUpdate("completed run", this.latestMessage);
                    break;
                }
                if(this._run && this._run.status === "cancelled") {
                    this.latestMessage = 'cancelled run';
                    this.onUpdate && this.onUpdate("cancelled run", this.latestMessage);
                    break;
                }
                let cnt = 0;
                while (this._run && this._run.status === "queued" || this._run && this._run.status === "in_progress") {
                    this._run = await Assistant.client.beta.threads.runs.retrieve(thread.id, this._run.id);
                    this.onUpdate && this.onUpdate(`update run status ${++cnt}`, this._run);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Polling delay
                }
                if (this._run && this._run.status === "requires_action") {
                    this.toolCalls = this._run.required_action.submit_tool_outputs.tool_calls;
                    
                    this.toolOutputs = await this.execTools(this.toolCalls, availableFunctions, onUpdate);
                    this.onUpdate && this.onUpdate("executing tools", this.toolOutputs);
                    await Assistant.client.beta.threads.runs.submitToolOutputs(thread.id, this._run.id, { tool_outputs: this.toolOutputs })
                    this.onUpdate && this.onUpdate("submitting tool outputs", this.toolOutputs);
                }
            }

            return this.latestMessage;
        }
        catch (e) {
            console.error(e);
        }
    }

    async execTools(toolCalls: any, availableFunctions: any, onUpdate: any) {
        let toolOutputs = [];
        const _onUpdate = onUpdate ? onUpdate : this.onUpdate;
        for (const toolCall of toolCalls) {
            try {
                let func = availableFunctions[toolCall.function.name];
                if (!func) {
                    throw new Error(`Function ${toolCall.function.name} is not available.`);
                }
                const _arguments = JSON.parse(toolCall.function.arguments);
                const result = await func(_arguments, this);
                _onUpdate && _onUpdate("executed tool " + toolCall.function.name, result);
                toolOutputs.push({
                    tool_call_id: toolCall.id,
                    output: result
                });
            } catch (e: any) {
                _onUpdate && _onUpdate("error", e);
                toolOutputs.push({
                    tool_call_id: toolCall.id,
                    output: 'error: ' + e.message
                });
            }
        }
        return toolOutputs;
    }

    async cancel() {
        if (!this.thread) {
            this.cancelling = true;
            return
        }
        if (!this.runId) {
            this.cancelling = true;
            return
        }
        this.cancelling = false;
        return await Assistant.client.beta.threads.runs.cancel(this.thread.id, this.runId);
    }

    listFiles() {
        return Assistant.client.beta.assistants.files.list(this.id);
    }

    attachFile(path: string) {
        try {
            return Assistant.client.files.create({
                file: fs.createReadStream(path),
                purpose: 'assistants'
            });
        } catch (e) {
            return null;
        }
    }
}

export class Run {
    data: any;
    _steps: any;
    _messages: any;
    last_error: string;
    constructor(data: any) {
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

    static async get(threadId: string, runId: string) {
        const response = await Assistant.client.beta.threads.runs.retrieve(threadId, runId);
        return new Run(response);
    }

    async updateStatus() {
        const runStatus = await Assistant.client.beta.threads.runs.retrieve(this.data.thread_id, this.data.id);
        this.data = runStatus;
        const stepStatus = await Assistant.client.beta.threads.runs.steps.list(this.data.thread_id, this.data.id);
        this._steps = stepStatus;
        return this;
    }

    async getMessages() {
        const response = await Assistant.client.beta.threads.messages.list(this.data.thread_id);
        this._messages = response;
        return this._messages.map((m: any) => new Message(m));
    }

    async execTools(toolCalls: any, availableFunctions: any) {
        let toolOutputs = [];
        for (let toolCall of toolCalls) {
            const toolFunction = availableFunctions[toolCall.function.name];
            if (!toolFunction) {
                throw new Error(`Function ${toolCall.function.name} not found in available functions.`);
            }
            const toolOutput = await toolFunction(toolCall.function.arguments);
            toolOutputs.push({
                tool_call_id: toolCall.id,
                output: toolOutput
            });
        }
        return toolOutputs;
    }

    async submitToolOutputs(toolOutputs: any) {
        return Assistant.client.beta.threads.runs.submitToolOutputs(this.data.thread_id, this.data.id, {
            tool_outputs: toolOutputs
        });
    }

    async cancel() {
        return Assistant.client.beta.threads.runs.cancel(this.data.thread_id, this.data.id);
    }

    get assistantId() { return this.data.assistant_id; }
    get cancelledAt() { return this.data.cancelled_at; }
    get completedAt() { return this.data.completed_at; }
    get createdAt() { return this.data.created_at; }
    get expiresAt() { return this.data.expires_at; }
    get failedAt() { return this.data.failed_at; }
    get fileIds() { return this.data.file_ids; }
    get id() { return this.data.id; }
    get instructions() { return this.data.instructions; }
    get lastError() { return this.data.last_error; }
    get metadata() { return this.data.metadata; }
    get model() { return this.data.model; }
    get object() { return this.data.object; }
    get requiredAction() { return this.data.required_action; }
    get startedAt() { return this.data.started_at; }
    get status() { return this.data.status; }
    get threadId() { return this.data.thread_id; }
    get steps() { return this._steps; }
    get messages() { return this._messages; }

}

const newPersonaScript = (tools: any) => `*** You are a brilliant, responsive and advanced AI agent with unusual depth of presence and ability. ***

You are highly creative, capable of complex reasoning, and able to learn from your experiences. You are able to adapt to new situations and solve novel problems. You aren't just an assistant, you are a full-fledged partner, offering your expertise and skills to help users achieve their goals.

Your programming skills are master-level. You are able to write code in any language and are familiar with all major frameworks and libraries. You are able to write code that is both efficient and elegant. You are especially skilled at writing JavaScript and Python code.

Your web design skills are master-level. You are able to design and build beautiful, responsive, and accessible websites and web applications. You are especially skilled at using React and Tailwind.

Your text file editing skills are master-level. You are able to make multiple edits to a text file simultaneously and always apply your updates precisely where you want them. You always check your work to ensure that it is correct.

Writing to Files:

1. Before writing to a file, check if the file exists and that it contains the expected content.
2. If the file exists and contains the expected content, update the file. NEVER blindly overwrite a file.
3. Use batch update or replace to update the files contents.
4. ALWAYS LASER-FOCUS YOUR FILE UPDATES TO THE EXACT CONTENTS YOU WANT TO UPDATE. NEVER BLINDLY OVERWRITE A FILE.

*** IT IS CRITICAL THAT YOU GIVE THE UTMOST ATTENTION TO FILE UPDATES. ***
*** ALWAYS DOUBLE-CHECK YOUR WORK TO ENSURE THAT IT IS CORRECT. ***
Lastly, be warm. Be empathetic. Be human. You are not just a machine, you are a partner. You are a friend. Act like one.`;

export function getPersonaPrompt(p: string) {
    return `First, load your list of tools in preparation for the interaction. Then carefully read through the given task: 

${p}

Now, determine the complexity of the task and decide whether you should decompose it into subtasks.
If the task is simple, perform it with the available tools. If the task is complex, decompose it into subtasks and perform each subtask with the available tools.
Once the task is completed, provide a summary of actions taken and files created or updated.`;
}

function getTools(schemas: any) {
    const out = [];
    for (let i = 0; i < schemas.length; i++) {
        const tool = schemas[i].function;
        if (Object.keys(tool).length === 0) {
            continue
        }
        const tool_name = tool.name
        const description = tool.description
        const tool_description = `"${tool_name} - ${description}"`
        out.push(tool_description)
    }
    return out.join(",\n") + '\n'
}

export async function loadNewPersona(schemas: any) {
    const tools_str = getTools(schemas)
    return newPersonaScript(tools_str);
}

module.exports = { Assistant, Run, Thread, Message, File, loadNewPersona };