import * as vscode from 'vscode';

export default function navigateTo() {
    return {
        config: {
            type: "function",
            function: {
                name: "navigateTo",
                description: "Navigates to a specific position or line in a file",
                parameters: {
                    type: "object",
                    properties: {
                        filePath: {
                            type: "string",
                            description: "The file path to navigate in"
                        },
                        line: {
                            type: "number",
                            description: "The line number to navigate to"
                        },
                        character: {
                            type: "number",
                            description: "The character position on the line (optional)"
                        }
                    },
                    required: ["filePath", "line"]
                }
            }
        },
        function: async (params) => {
            const { filePath, line, character = 0 } = params;
            const uri = vscode.Uri.file(filePath);
            
            try {
                const document = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(document, {
                    selection: new vscode.Range(line, character, line, character)
                });
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }
    }
}
