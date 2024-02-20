"use strict";
const AssistantAPI = require('@nomyx/assistant');
module.exports = {
    prompt: `INSTRUCTIONS: generate an assistant tool in Javascript that will perform a set of given requirements.
  
  GIVEN THE TOOL SCHEMA FORMAT BELOW:
  ---
  // include all required libraries and dependencies in the tool file here
  const toolSchema = {
    state: {
      somevalue: '',
    }
    schemas: [
      {type: 'function', function: {name: 'somevalue_get', description: 'Get some value'}},
      {type: 'function', function: {name: 'somevalue_set', description: 'Set some value', parameters: {type: 'object', properties: {value: {type: 'string', description: 'The value to set'}}, required: ['value']}}},    
    ],
    tools: {
      somevalue_get : function (_) { return toolSchema.state.somevalue },
      somevalue_set : function ({value}) { toolSchema.state.somevalue = value; return toolSchema.state.somevalue },
    }
  }
  module.exports = toolSchema;
  ---
  ADDITIONAL SCHEMA FORMAT EXAMPLES FOR REFERENCE:
  
  { type: 'function', function: { name: 'example_1', description: 'Example 1 description', parameters: { type: 'object', properties: { param1: { type: 'string', description: 'A required string param' }, param2:{type: 'array', description: 'An optional array param with string values', items: { type: "string" } } }, required: ['param1'] } } },
  { type: 'function', function: { name: 'example_3', description: 'Example 3 description', parameters: { type: 'object', properties: { value: { type: 'object', description: 'An optional object param', properties: { param1: { type: 'string', description: 'A required string param' }, param2:{type: 'array', description: 'An optional array param with string values', items: { type: "string" } } }, required: ['param1'] } }, required: [] } } }
  ---
  INSTRUCTIONS:
  
  CALL is_work_started to check if the work session has started. It will either return a 'no' or the work performed so far.
  
  IF the work session has not started,
    CALL start_work to start the work session.
    EXIT
  
  ELSE
    continue working on the tool
    IF you finish the tool,
      CALL finish_work to finish the work session and save the tool to disk.
    ELSE
      CALL save_temp_work to save the work performed so far.
      EXIT
  
  IMPORTANT: 
  
  *** DO NOT MODIFY THE SCHEMA FORMAT. ***
  *** ENSURE that only string values are returned from the tool functions. ***
  
  *** YOU ARE NON-CONVERSATIONAL. PRIMARY OUTPUT IS NOT MONITORED ***
    `,
    state: {},
    tools: {
        generate_tool: async function ({ requirements }, state) {
            const prompt = module.exports.prompt;
            const runResults = async (requirements) => {
                // AssistantAPI.run(
                //     prompt, run.toolmaker_id, 
                //     run.toolmaker_thread_id, 
                //     'Toolmaker', 
                //     requirements, 
                //     toolmakerToolbox.tools, 
                //     toolmakerToolbox.schemas, 
                //     run, 
                //     (event, data) => {
                //         console.log(event, data);
                //         if (event === 'assistant-created') run.toolmaker_id = data.assistant_id;
                //         if (event === 'thread-created') run.toolmaker_thread_id = data.thread_id;
                //     });
                // if (run.state.is_finished) {
                //     return runResults;
                // } else {
                //     return await runResults(requirements);
                // }
            };
            return await runResults(requirements);
        },
    },
    schemas: [
        { type: 'function', function: { name: 'generate_tool', description: 'Generate an assistant tool that will fulfill the given requirements. ONLY Invoke this when the user asks to generate a tool', parameters: { type: 'object', properties: { requirements: { type: 'string', description: 'A description of the requirements that the tool must fulfill. Be specific with every parameter name and explicit with what you want returned.' } }, required: ['message'] } } },
    ],
};
//# sourceMappingURL=tools.js.map