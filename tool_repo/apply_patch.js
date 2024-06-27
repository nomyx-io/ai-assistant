const fs = require('fs').promises;
const path = require('path');

class ApplyPatchTool {
  constructor() {
    this.name = 'apply_patch';
    this.description = 'Apply a universal patch to a file. Pass a file path, a patch string, and an optional resultVar to save the patched file contents.';
    this.parameters = [
      { name: 'file', type: 'string', required: true },
      { name: 'patch', type: 'string', required: true },
      { name: 'resultVar', type: 'string', required: false }
    ];
  }

  async execute(params, api) {
    if (!Array.isArray(params)) params = [params];
    for (const { file, patch, resultVar } of params) {
      try {
        if (!file || !patch) {
          throw new Error("Both 'file' and 'patch' are required parameters for the 'apply_patch' tool.");
        }
        const filePath = path.resolve(file);
        if (!(await fs.access(filePath).then(() => true).catch(() => false))) {
          throw new Error(`The file '${file}' does not exist.`);
        }
        try {
          const result = await api.callTool('busybox', {
            command: 'patch',
            args: [file],
            options: { input: patch },
            resultVar,
          });
          if (resultVar) {
            api.store[resultVar] = result;
          }
          return result;
        } catch (error) {
          try {
            const fileContent = await fs.readFile(file, 'utf8');
            return await api.callTool('callLLM', {
              system_prompt: 'Given one or more universal patches and file content, analyze the patches and the file content to determine the best way to apply the patch to the content, then apply the patch to the file. Return ONLY the patched file contents IN ITS ENTIRETY.',
              prompt: `File content: ${fileContent}\n\nPatch: ${patch}`,
            });
          } catch (error) {
            throw new Error(`Failed to apply patch: ${error.message} Tool source: ${error.stack}`);
          }
        }
      } catch (error) {
        const llmResponse = await api.callTool('callLLM', {
          system_prompt: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
          prompt: JSON.stringify({
            error: error.message,
            stackTrace: error.stack,
            context: { file, patch, resultVar },
          }),
        });
        if (llmResponse.fix) {
          return llmResponse.fix;
        }
        throw error;
      }
    }
  }
}

module.exports = ApplyPatchTool;