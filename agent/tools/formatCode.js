const vscode = require('vscode');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'formatCode',
            description: 'Formats the code in the given file.',
            parameters: {
                type: 'object',
                properties: {
                    filePath: {
                        type: 'string',
                        description: 'The file path of the document to format.'
                    },
                    range: {
                        type: 'object',
                        description: 'The specific range within the document to format.',
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
                    }
                },
                required: ['filePath']
            }
        },
    },
    function: async ({ filePath, range }) => {
        const uri = vscode.Uri.file(filePath);
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            let vscodeRange;
            if (range) {
                const start = new vscode.Position(range.start.line, range.start.character);
                const end = new vscode.Position(range.end.line, range.end.character);
                vscodeRange = new vscode.Range(start, end);
            }
            await vscode.commands.executeCommand('editor.action.formatDocument', vscodeRange);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};

