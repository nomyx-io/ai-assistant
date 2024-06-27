import { Tool } from './tool-base';

class analyze_and_create_toolTool extends Tool {
  constructor() {
    super('analyze_and_create_tool', {
      type: "object",
      properties: {
        script: {
          type: "string",
          description: "The script to analyze"
        },
        taskDescription: {
          type: "string",
          description: "Description of the task the script performs"
        }
      },
      required: [
        "script",
        "taskDescription"
      ]
    });
  }

  async execute(params, api) {
    await api.analyzeAndCreateToolFromScript(params.script, params.taskDescription);
    return 'Analysis and tool creation completed';
  }
}

export default new analyze_and_create_toolTool();