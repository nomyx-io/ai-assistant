import { Tool } from './tool-base';

class generate_tool_reportTool extends Tool {
  constructor() {
    super('generate_tool_report', 'Generate a report of available tools');
  }

  async execute(params, api) {
    return api.generateReport(params.format || 'text');
  }
}

export default new generate_tool_reportTool();