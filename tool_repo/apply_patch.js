// This is javascript code for a tool module
class apply_patchTool {

  async execute(params, api) {
    if (!Array.isArray(params))
      params = [params];
    for (const { file, patch, resultVar } of params) {
      try {
        if (!file || !patch) {
          throw new Error("Both 'file' and 'patch' are required parameters for the 'apply_patch' tool.");
        }
        const existsSync = require('fs').existsSync;
        const filePath = require('path').resolve(file);
        if (!(await existsSync(filePath))) {
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
            const fs = require('fs').promises;
            const fileContent = await fs.readFile(file, 'utf8');
            const results = await api.conversation.chat([
              {
                role: 'system',
                content: 'Given one or more universal patches and file content, analyze the patches and the file content to determine the best way to apply the patch to the content, then apply the patch to the file. Return ONLY the patched file contents IN ITS ENTIRETY.',
              },
              {
                role: 'user',
                content: `File content: ${fileContent}\n\nPatch: ${patch}`,
              },
            ]);
            return results.content[0].text;
          } catch (error) {
            throw new Error(`Failed to apply patch: ${error.message} Tool source: ${error.stack}`);
          }
        }
      } catch (error) {
        let llmResponse = await api.conversation.chat([
          {
            role: 'system',
            content: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              error: error.message,
              stackTrace: error.stack,
              context: { file, patch, resultVar },
            }),
          },
        ]);
        llmResponse = llmResponse.content[0].text.trim();
        throw new Error(llmResponse);
      }
    }
  }

}

module.exports = new apply_patchTool();