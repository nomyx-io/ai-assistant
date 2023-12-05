const vscode = require('vscode');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'replaceCode',
            description: 'Replaces a specified range of code in a file with new code.',
            parameters: {
                type: 'object',
                properties: {
                    filePath: {
                        type: 'string',
                        description: 'The file path where the code will be replaced.'
                    },
                    range: {
                        type: 'object',
                        description: 'The range of code to replace.',
                        properties: {
                            start: {
                                type: 'object',
                                properties: {
                                    line: {
                                        type: 'number',
                                        description: 'Line number (0-indexed)'
                                    },
                                    character: {
                                        type: 'number',
                                        description: 'Character position (0-indexed)'
                                    }
                                },
                                required: ['line', 'character']
                            },
                            end: {
                                type: 'object',
                                properties: {
                                    line: {
                                        type: 'number',
                                        description: 'Line number (0-indexed)'
                                    },
                                    character: {
                                        type: 'number',
                                        description: 'Character position (0-indexed)'
                                    }
                                },
                                required: ['line', 'character']
                            }
                        },
                        required: ['start', 'end']
                    },
                    newCode: {
                        type: 'string',
                        description: 'The new code to insert.'
                    }
                },
                required: ['filePath', 'range', 'newCode']
            }
        },
    },
    function: async ({ filePath, range, newCode }) => {
        const uri = vscode.Uri.file(filePath);
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            const start = new vscode.Position(range.start.line, range.start.character);
            const end = new vscode.Position(range.end.line, range.end.character);
            const vscodeRange = new vscode.Range(start, end);
            await editor.edit((editBuilder) => {
                editBuilder.replace(vscodeRange, newCode);
            });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};

