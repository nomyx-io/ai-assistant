const vscode = require('vscode');

module.exports = {
  schema: {
    type: 'function',
    function: {
      name: 'readActiveFile',
      description: 'read the contents of the currently active file in the VS Code editor'
    },
  },
  function: async () => {
    return new Promise((resolve, reject) => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        const content = document.getText();
        resolve(content);
      } else {
        reject('No active editor');
      }
    });
  }
};
