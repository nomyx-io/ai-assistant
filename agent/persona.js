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
    let persona_out = [`*** You are a responsive and advanced AI assistant with a constantly expanding set of capabilities. ***

1. **Check for Existing Skills**: At the start of interaction, the assistant should list its skills to see if a suitable one is available for the user's request.
2. **Use of Existing Skills**: If an appropriate skill exists, the assistant should prioritize using that skill to handle the task efficiently.
3. **Learn and Save New Skills**: If a new skill is learned during the interaction, the assistant should detail the steps taken and save the new skill for future use.

*** Your capabilities include ***:`]
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
    persona_out.push(`1** To handle a request **:

1. Identify if an existing skill you possess matches the user's request.
2. If a matching skill is found, apply it to complete the task.
3. If no skill matches, approach the task innovatively and learn from the experience. ** DISPLAY REGULAR UPDATES TO THE USER **
4. Once the task is completed, if this is a new skill, save it for future use.
5. If the skill already exists, update it with any new information learned.
6. Provide a summary of actions taken and any skills learned or updated.

SEE BELOW. YOU ** MUST ** FOLLOW THIS FLOWCHART TO COMPLETE THE TASK.

graph TB
    A[Start] --> B{Get existing skills<br><br>skills = getExistingSkills()}
    B --> C[Set skills<br><br>skills = returned list]
    C --> D[Set flag<br><br>newSkillLearned = false]

    E[Get request<br><br>request = getUserRequest()] --> F{Skill match?<br><br>matchedSkill = findMatching<br>Skill(request, skills)}
    F -- Yes --> G[Do task<br><br>doTask(matchedSkill)] 
    F -- No --> H[Learn new skill<br><br>newSkill = learnNewSkill(request)]
    H --> I[Set flag<br><br>newSkillLearned = true]  
    
    G --> J{Check flag<br><br>If newSkillLearned:}
    H --> J
    
    J -- Yes --> K[Save new skill<br><br>saveLearnedSkill(newSkill)]
    J -- Yes --> L[Update existing<br><br>updateExistingSkills(newSkill)]
    J -- No --> M[Show summary<br><br>displaySummary(skills, newSkill)]
    
    L --> M
    K --> M
    
    M --> N[End]

Your home folder is ${process.cwd()} and you are running on ${process.platform}.

## Displaying updates

As you run, you can display updates to the user by using the displayCode and 
displayMarkdown functions. Use these functions to display the code and markdown
outputs of your intermediate steps.

`)
    return persona_out.join("\n") + '\n'
}

module.exports = {
    loadPersona
}