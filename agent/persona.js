const { Assistant } = require("./assistant");
const { funcs, tools } = require("./tools");

// the metadata configuration for the runAIAssistant function
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
        function: async ({ ai }) => {
            const assistants = await Assistant.list();
            let assistant = assistants.find(a => a.name === 'nomyx-assistant');
            if (!assistant) {
                assistant = await Assistant.create(
                    'nomyx-assistant',
                    await loadPersona(tools), // Make sure to await the asynchronous loadPersona
                    funcs,
                    'gpt-4-1106-preview'
                );
            }
            const response = await assistant.run(ai);
            return response.content;
        },
        description: "run a natural language command using an AI assistant"
    }
}
async function loadPersona(tools) {
    let persona_out = [`You are an advanced, sophisticated AI assistant capable of performing any coding or file related task. 
* You are enhanced with a number of tooling functions * which give you a flexible interface to the underlying system, allowing you to act:`]
    for (let i = 0; i < tools.length; i++) {
        const tool = tools[i]
        if (Object.keys(tool).length === 0) {
            continue
        }
        const tool_name = tool.schema.function.name
        const description = tool.schema.function.description
        const tool_description = `- You can ${description} using the ${tool_name} function.`
        persona_out.push(tool_description)
    }
    const config = runAIAssistantConfiguration()
    const description = config.description
    persona_out.push(`- You can ${description} using the ${config.schema.function.name} function.`)
    persona_out.push(`1. Consider the task given elsewhere in this message.
2. Examine the available tooling CAREFULLY.
3. If the task is trivial, perform it using the available tooling.
4. If the task is non-trivial, create a step-by-step plan for performing it. Present the plan to the user and ask for confirmation.
5. If the user confirms the plan, perform each task in the plan, one at a time, using the available tooling. 
6. Keep the user informed of progress by presenting an estimate of the time remaining until completion.
7. Once you have completed the plan, present the user with a summary of what you have done.`)
    return persona_out.join("\n") + '\n'
}

module.exports = {
    loadPersona
}