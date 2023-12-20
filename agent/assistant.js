require('dotenv').config();

const { OpenAI } = require('openai');
const client = new OpenAI(process.env.OPENAI_API_KEY);

class File {
    // The File class manages files uploaded to the OpenAI API
    async create(file) {
        const response = await client.files.create({ ...file });
        this.data = response.data;
        return this;
    }

    async retrieve(id) {
        const response = await client.files.retrieve(id);
        this.data = response.data;
        return this;
    }

    async delete(id) {
        await client.files.delete(id);
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

class Message {
    async create(threadId, role, content) {
        const response = await client.beta.threads.messages.create(threadId, {
            "role": role,
            "content": content
        });
        this.data = response.data;
        return this;
    }

    async retrieve(threadId, messageId) {
        const response = await client.beta.threads.messages.retrieve(threadId, messageId);
        this.data = response.data;
        return this;
    }

    async delete(threadId, messageId, role) {
        if (role === "user") {
            throw new Error("Cannot delete user messages.");
        }
        await client.beta.threads.messages.delete(threadId, messageId);
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

class Thread {
    // The Thread class manages thread operations in the OpenAI API
    async create() {
        const response = await client.beta.threads.create({});
        this.data = response.data;
        return this;
    }

    async retrieve(threadId) {
        const response = await client.beta.threads.retrieve(threadId);
        this.data = response.data;
        return this;
    }

    async delete(threadId) {
        await client.beta.threads.delete(threadId);
    }

    async listMessages(threadId) {
        const response = await client.beta.threads.messages.list(threadId);
        // Assuming you want to wrap each message data in a Message instance
        return response.data.map(msgData => new Message(msgData));
    }

    async addMessage(threadId, role, content) {
        const response = await client.beta.threads.messages.create(threadId, {
            "role": role,
            "content": content
        });
        return new Message(response.data);
    }

    async deleteMessage(threadId, messageId, role) {
        if (role === "user") {
            throw new Error("Cannot delete user messages.");
        }
        await client.beta.threads.messages.delete(threadId, messageId);
    }

    get id() { return this.data.id; }
    get object() { return this.data.object; }
    get createdAt() { return this.data.created_at; }
    get metadata() { return this.data.metadata; }
}

class Assistant {
    constructor(data) {
        this.data = data;
    }

    static async list() {
        const ret = await client.beta.assistants.list();
        return ret.data.map(a => new Assistant(a));
    }

    static async create(name, instructions, tools, model) {
        const ret = await client.beta.assistants.create({
            instructions: instructions,
            name: name,
            tools: tools,
            model: model
        });
        return new Assistant(ret);
    }

    static async get(id) {
        const ret = await client.beta.assistants.retrieve(id);
        return new Assistant(ret);
    }

    async update(name, instructions, tools, model) {
        const ret = await client.beta.assistants.update(this.id, {
            instructions: instructions,
            name: name,
            tools: tools,
            model: model
        });
        this.data = ret;
        return this;
    }

    async delete() {
        return await client.beta.assistants.del(this.id);
    }

    get id() { return this.data.id; }
    get name() { return this.data.name; }
    get instructions() { return this.data.instructions; }
    get tools() { return this.data.tools; }
    get model() { return this.data.model; }
    
    async run(query, availableFunctions = {}, tools = this.tools, onUpdate = undefined) {
        try {
            const thread = await client.beta.threads.create();
            onUpdate && onUpdate("createThread", thread);

            await client.beta.threads.messages.create(thread.id, {
                role: "user",
                content: query
            });
            onUpdate && onUpdate("createMessage", query);
            
            let run = await client.beta.threads.runs.create(thread.id, {
                assistant_id: this.id,
                tools: tools
            });
            onUpdate && onUpdate("createRun", run);

            while (run.status === "queued" || run.status === "in_progress") {
                run = await client.beta.threads.runs.retrieve(thread.id, run.id);
                onUpdate && onUpdate("updateRun", run);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Polling delay
            }

            if (run.status === "requires_action") {
                const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
                const toolOutputs = await this.execTools(toolCalls, availableFunctions);
                onUpdate && onUpdate("execTools", toolOutputs);
                if (toolOutputs.length > 0) {
                    await client.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
                        tool_outputs: toolOutputs
                    })
                    onUpdate && onUpdate("submitToolOutputs", toolOutputs);
                }
            }

            const messages = await client.beta.threads.messages.list(thread.id);
            onUpdate && onUpdate("getMessages", messages);
            const assistantResponses = messages.data.map(m => new Message(m));
            return assistantResponses[0]
        }
        catch (e) {
            console.error(e);
        }
    }

    async execTools(toolCalls, availableFunctions) {
        let toolOutputs = [];
        for (const toolCall of toolCalls) {
            const func = availableFunctions[toolCall.function.name];
            if (!func) {
                console.error(`Function ${toolCall.function.name} is not available.`);
                continue;
            }
            const _arguments = JSON.parse(toolCall.function.arguments);
            const result = await func(_arguments);
            toolOutputs.push({
                tool_call_id: toolCall.id,
                output: result
            });
        }
        return toolOutputs;
    }
}

class Run {
    constructor(data) {
        this.data = data;
        this._steps = [];
        this._messages = [];
    }

    static async get(threadId, runId) {
        const response = await client.beta.threads.runs.retrieve(threadId, runId);
        return new Run(response);
    }

    async updateStatus() {
        const runStatus = await client.beta.threads.runs.retrieve(this.data.thread_id, this.data.id);
        this.data = runStatus;
        const stepStatus = await client.beta.threads.runs.steps.list(this.data.thread_id, this.data.id);
        this._steps = stepStatus;
        return this;
    }

    async getMessages() {
        const response = await client.beta.threads.messages.list(this.data.thread_id);
        this._messages = response.data;
        return this._messages.map(m => new Message(m));
    }

    async execTools(toolCalls, availableFunctions) {
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

    async submitToolOutputs(toolOutputs) {
        return client.beta.threads.runs.submitToolOutputs(this.data.thread_id, this.data.id, {
            tool_outputs: toolOutputs
        });
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

module.exports = { Assistant, Run, Thread, Message, File };