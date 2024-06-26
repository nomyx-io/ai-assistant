(params, api) => __awaiter(void 0, void 0, void 0, function* () {
            if (!Array.isArray(params))
                params = [params];
            for (const { file, patch, resultVar } of params) {
                try {
                    if (!file || !patch) {
                        throw new Error("Both 'file' and 'patch' are required parameters for the 'apply_patch' tool.");
                    }
                    const existsSync = require('fs').existsSync;
                    const filePath = require('path').resolve(file);
                    if (!(yield existsSync(filePath))) {
                        throw new Error(`The file '${file}' does not exist.`);
                    }
                    try {
                        const result = yield api.callTool('busybox', {
                            command: 'patch',
                            args: [file],
                            options: { input: patch },
                            resultVar,
                        });
                        if (resultVar) {
                            api.store[resultVar] = result;
                        }
                        return result;
                    }
                    catch (error) {
                        try {
                            const fileContent = yield fs.readFile(file, 'utf8');
                            return yield api.callTool('callLLM', {
                                system_prompt: 'Given one or more universal patches and file content, analyze the patches and the file content to determine the best way to apply the patch to the content, then apply the patch to the file. Return ONLY the patched file contents IN ITS ENTIRETY.',
                                prompt: `File content: ${fileContent}\n\nPatch: ${patch}`,
                            });
                        }
                        catch (error) {
                            throw new Error(`Failed to apply patch: ${error.message} Tool source: ${error.stack}`);
                        }
                    }
                }
                catch (error) {
                    const llmResponse = yield api.callTool('callLLM', {
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
        })