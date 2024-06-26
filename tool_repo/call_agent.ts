({ prompt, model = 'claude', resultVar }, api) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (!prompt) {
                    throw new Error("The 'prompt' parameter is required for the 'call_agent' tool.");
                }
                if (model !== 'claude' && model !== 'gemini') {
                    throw new Error("Invalid model specified. Choose either 'claude' or 'gemini'.");
                }
                const compactRepresentation = () => {
                    return JSON.stringify(api.getSchemas());
                };
                const convo = new conversation_1.default(model);
                const jsonPrompt = `Transform the given task into a sequence of subtasks, each with a JavaScript script that uses the provided tools to achieve the subtask objective.

Available Tools:

${compactRepresentation()}

Additional tools can be explored using 'list_all_tools', 'get_tool_details', and 'load_tool'.

Process:

1. Analyze the task and identify necessary steps
2. Decompose into subtasks with clear objectives and input/output
3. For each subtask, write a JavaScript script using the tools
  a. Access previous subtask results with taskResults.<taskName>_results: \`const lastResult = taskResults.firstTask_results; ...\`
  b. Store subtask results in a variable for future use: \`const result = { key: 'value' }; taskResults.subtask_results = result; ...\`
  b. End the script with a return statement for the subtask deliverable: \`return result;\`
4. Test each script and verify the output
5. Provide a concise explanation of the subtask's purpose and approach

Data Management:

- Store subtask results in resultVar (JSON/array format): \`taskResults.subtask_results = result;\`
Access previous subtask data with taskResults.<resultVar>: \`const lastResult = taskResults.subtask_results; ...\`
Include only resultVar instructions in responses, not the actual data.

Output Format:
\`\`\`json
[
  {
  "task": "<taskName>:<description>",
  "script": "<JavaScript script>",
  "chat": "<subtask explanation>",
  "resultVar": "<optional result variable>"
  },
  // ... additional subtasks
]
\`\`\`

CRITICAL: Verify the JSON output for accuracy and completeness before submission. *** OUTPUT ONLY JSON ***`;
                const response = yield convo.chat([
                    {
                        role: 'system',
                        content: jsonPrompt,
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            task: 'First off: OUTPUTTING ONLY *VALID*, RAW JSON IS CRITICAL! Now read and handle this: ' + prompt,
                        }),
                    },
                ]);
                let tasks = response.content[0].text;
                // crop anything outside the ````json and ``` to get only the json response
                tasks = tasks.replace(/.*```json/g, '');
                tasks = tasks.replace(/.*```/g, '');
                tasks = tasks.replace(/[\r\n]+/g, '');
                let message = '';
                try {
                    tasks = JSON.parse(tasks);
                }
                catch (error) {
                    tasks = api.extractJson(response.content[0].text);
                    message = error.message;
                }
                if (!Array.isArray(tasks) || tasks.length === 0) {
                    api.emit('error', message);
                    throw new Error('The task must be an array of subtasks. Check the format and try again. RETURN ONLY JSON RESPONSES' + message);
                }
                const results = [];
                api.store[prompt] = tasks;
                if (resultVar) {
                    api.store[resultVar] = results;
                }
                for (const task of tasks) {
                    let { task: taskName, script, chat } = task;
                    const splitTask = taskName.split(':');
                    let taskId = taskName;
                    if (splitTask.length > 1) {
                        taskId = splitTask[0];
                        taskName = splitTask[1];
                    }
                    api.store['currentTaskId'] = taskId;
                    api.emit('taskId', taskId);
                    api.store[`${taskId}_task`] = task;
                    api.emit(`${taskId}_task`, task);
                    api.store[`${taskId}_chat`] = chat;
                    api.emit(`${taskId}_chat`, chat);
                    api.store[`${taskId}_script`] = script;
                    api.emit(`${taskId}_script`, script);
                    const sr = yield api.callScript(script);
                    task.scriptResult = sr;
                    api.store[`${taskId}_result`] = sr;
                    api.store[`${taskId}_results`] = sr;
                    const rout = { id: taskId, task: taskName, script, result: sr };
                    api.emit(`${taskId}_results`, rout);
                    results.push(rout);
                }
                if (resultVar) {
                    api.store[resultVar] = results;
                }
                return results;
            }
            catch (error) {
                const llmResponse = yield api.callTool('callLLM', {
                    system_prompt: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
                    prompt: JSON.stringify({
                        error: error.message,
                        stackTrace: error.stack,
                        context: { prompt, model, resultVar },
                    }),
                });
                if (llmResponse.fix) {
                    return llmResponse.fix;
                }
            }
        })