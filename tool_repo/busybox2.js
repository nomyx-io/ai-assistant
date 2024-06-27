class Busybox2 {
  async files(operations) {
    try {
      const fs = require('fs');
      const pathModule = require('path');
      const cwd = process.cwd();
      for (const { operation, path, match, data, position, target } of operations) {
        const p = pathModule.join(cwd, path || '');
        const t = pathModule.join(cwd, target || '');
        if (!fs.existsSync(p || t)) {
          return `Error: File not found at path ${p || t} `;
        }
        let text = fs.readFileSync(p, 'utf8');
        switch (operation) {
          case 'read':
            return text;
          case 'append':
            text += data;
            break;
          case 'prepend':
            text = data + text;
            break;
          case 'replace':
            text = text.replace(match, data);
            break;
          case 'insert_at':
            text = text.slice(0, position) + data + text.slice(position);
            break;
          case 'remove':
            text = text.replace(match, '');
            break;
          case 'delete':
            fs.unlinkSync(p);
            break;
          case 'copy':
            fs.copyFileSync(p, t);
            break;
          default:
            return `Error: Unsupported operation ${operation} `;
        }
        fs.writeFileSync(p, text);
      }
      return `Successfully executed batch operations on files`;
    } catch (error) {
      const context = {
        errorCode: error.code,
        operations: operations,
      };
      await this.handleFileError(context);
      return `File operation '${operations}' failed. Check logs for details.`;
    }
  }

  async handleFileError(context) {
    console.error('File operation error:', context);
  }
}

module.exports = Busybox2;