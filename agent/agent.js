const axios = require("axios").default;

/**
 * Call the OpenAI API to run a natural language command
 * @param req 
 * @returns 
 */
const callChatCompletion = async (req, apiKey) => {
    const _query = async (req) => {
        let res = await axios.post("https://api.openai.com/v1/chat/completions",
            JSON.stringify(req), {
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + apiKey + ""
            }
        })
        return res.data.choices[0]
    }
    let retryCount = 0
    try { return _query(req) }
    catch (error) {
        // if this is a 429 error, determine how long to wait and retry
        if (error.response && error.status === 429) {
            const retryAfter = error.response.headers['retry-after']
            if (retryAfter) {
                retryCount++
                const retryAfterSeconds = parseInt(retryAfter)
                console.log(`Received 429 error, retrying after ${retryAfterSeconds} seconds`)
                await new Promise((resolve) => setTimeout(resolve, retryAfterSeconds * 1000))
                return _query(req)
            }
        }
        else { throw error }
    }
}

/**
 * Run a natural language command using an AI assistant
 * @returns 
 */
function runAIAssistantConfiguration() {
    return {
        schema: {
            type: "function",
            function: {
                name: "runAIAssistant",
                description: "Run a natural language command using an AI assistant",
                parameters: {
                    type: "object",
                    properties: {
                        ai: {
                            type: "string",
                            description: "The natural language command to run"
                        }
                    },
                    required: ["ai"]
                }
            }
        },
        function: _runAIAssistant,
        description: "run a natural language command using an AI assistant"
    }
}

/**
 * Load the persona
 * @returns 
 */
async function loadPersona(tools) {
    let persona_out = [`You are an advanced, sophisticated AI assistant capable of performing any coding-related task. 
You are fully-integrated into VS Code as well as enhanced with a number of tooling functions which give you a 
flexible interface to the underlying system:`]
    for (let i = 0; i < tools.length; i++) {
        const tool = tools[i]
        const tool_name = tool.schema.function.name
        const description = tool.schema.function.description
        const tool_description = `- You can ${description} using the ${tool_name} function.`
        persona_out.push(tool_description)
    }
    const config = runAIAssistantConfiguration()
    const description = config.description
    persona_out.push(`- You can ${description} using the ${config.schema.function.name} function.`)
    persona_out.push(`Perform the following task to the best of your ability given the available tooling. Output [DONE] once you Your Task:`)
    return persona_out.join("\n") + '\n'
}

/**
 * Get a request
 * @param request 
 * @param onStream 
 * @param tools 
 * @param available_functions 
 * @returns 
 */
async function getRequest(
    request,
    tools,
    apiKey
) {
    try {
        let response = await callChatCompletion(request, apiKey)
        if (response.message.tool_calls) for (let i = 0; i < response.message.tool_calls.length; i++) {

            const response_message = response.message
            request.messages.push(response_message)

            let tool_call = response_message.tool_calls[i]
            let function_name = tool_call.function.name
            let function_to_call = tools.find(tool => tool.schema.function.name === function_name).function
            let function_args = tool_call.function.arguments

            let args
            try {
                // strip all \n and \r from the args
                function_args = function_args.replace(/(\r\n|\n|\r)/gm, "")
                args = JSON.parse(function_args)
            } catch (error) {
                // look for """ in the args and get everything between them
                const regex = /"""([^]*)"""/gm;
                let m;
                let arg_string = ''
                while ((m = regex.exec(function_args)) !== null) {
                    // This is necessary to avoid infinite loops with zero-width matches
                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                    arg_string = m[1]
                }
                // replace the arg string with the parsed arg string
                function_args = function_args.replace(regex, JSON.stringify(arg_string))
            }

            let function_response = await function_to_call(JSON.parse(function_args))
            let fr = {
                tool_call_id: tool_call.id,
                role: "tool",
                name: function_name,
            }
            fr.content = function_response
            request.messages.push(fr)
             }

        delete request.tools
        delete request.tool_choice
        response = await callChatCompletion(request, apiKey)
        delete response.message.tool_calls
        request.messages.push(response.message)
        delete request.stream

        return request
    } catch (error) {
        console.log(error)
    }
}

/**
 * Run an AI assistant
 * @param params 
 * @returns 
 */
async function _runAIAssistant({ ai, history, tooling, apiKey }) {


    const createConversation = async (ai, tools) => {
        const toolSchemas = []
        tools.forEach(tool => {
            toolSchemas.push(tool.schema)
        })
        return {
            model: "gpt-4-1106-preview",
            tools: toolSchemas,
            tool_choice: 'auto',
            temperature: 0.95,
            messages: history && history.length > 0 ? [...history, { role: "user", content: ai }] : [{
                role: "system",
                content: await loadPersona(tools),
            }, { role: "user", content: ai }]
        }
    };

    return new Promise(async (resolve, reject) => {
        let conversation = await createConversation(ai, tooling)
        const converse = async (conversation) => {
            conversation = await getRequest(conversation, tooling, apiKey)
            const latestMessage = conversation.messages[conversation.messages.length - 1].content
            if (latestMessage.split('[DONE]').length > 1) {
                conversation.messages[conversation.messages.length - 1].content = latestMessage.split('[DONE]').join('')
                if(conversation.messages[conversation.messages.length - 1].content === '') conversation.messages = conversation.messages.slice(0, -1)
                return resolve(conversation)
            }
            resolve(conversation);
        }
        converse(conversation)
    })
}

/**
 * Run an AI assistant
 * @param params 
 * @returns 
 */
async function runAIAssistant(params) {
    let { ai, history, tooling, apiKey } = params
    console.log(ai)
    let response = await _runAIAssistant({ ai, history, tooling,  apiKey })
    return response.messages
}

module.exports = {
    runAIAssistantConfiguration,
    runAIAssistant
}