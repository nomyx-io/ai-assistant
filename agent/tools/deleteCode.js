import * as vscode from 'vscode';

export default function deleteCode() {
    return {
        config: {
            type: "function",
            function: {
                name: "deleteCode",
                description: "Deletes a specific range of code in a file",
                parameters: {
                    type: "object",
                    properties: {
                        filePath: {
                            type: "string",
                            description: "The file path where code should be deleted"
                        },
                        range: {
                            type: "object",
                            description: "The range of code to delete",
                            properties: {
                                startLine: { type: "number", description: "Start line of the range" },
                                startCharacter: { type: "number", description: "Start character of the range" },
                                endLine: { type: "number", description: "End line of the range" },
                                endCharacter: { type: "number", description: "End character of the range" }
                            },
                            required: ["startLine", "startCharacter", "endLine", "endCharacter"]
                        }
                    },
                    required: ["filePath", "range"]
                }
            }
        },
        function: async (params) => {
            const { filePath, range } = params;
            const uri = vscode.Uri.file(filePath);
            
            try {
                const document = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(document);
                const start = new vscode.Position(range.startLine, range.startCharacter);
                const end = new vscode.Position(range.endLine, range.endCharacter);
                const vscodeRange = new vscode.Range(start, end);

                await editor.edit(editBuilder => {
                    editBuilder.delete(vscodeRange);
                });
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }
    }
}
