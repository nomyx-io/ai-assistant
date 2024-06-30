module.exports = {
    'busybox': {
    'name': 'busybox',
    'version': '1.0.0',
    'description': 'Performs file operations. Supported operations include read, append, prepend, replace, insert_at, remove, delete, copy, move, create, mkdir, rmdir, chmod, chown, stat, exists, ls, size, mtime, atime, ctime.',
    'schema': {
      'name': 'busybox',
      'description': 'Performs file operations. Supported operations include read, append, prepend, replace, insert_at, remove, delete, copy, move, create, mkdir, rmdir, chmod, chown, stat, exists, ls, size, mtime, atime, ctime.',
      "methodSignature": "files(operations: { operation: string, path: string, match: string, data: string, position: number, target: string }[]): string",
    },
    execute: async function ({ operations }, run) {
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
            case 'move':
              fs.renameSync(p, t);
              break;
            case 'create':
              fs.writeFileSync(p, data || '');
              break;
            case 'mkdir':
              fs.mkdirSync(p);
              break;
            case 'rmdir':
              fs.rmdirSync(p, { recursive: true });
              break;
            case 'chmod':
              fs.chmodSync(p, data);
              break;
            case 'chown':
              fs.chownSync(p, data);
              break;
            case 'stat':
              return fs.statSync(p);
            case 'exists':
              return fs.existsSync(p || t);
            case 'ls':
              return fs.readdirSync(p);
            case 'size':
              return fs.statSync(p).size;
            case 'mtime':
              return fs.statSync(p).mtime;
            case 'atime':
              return fs.statSync(p).atime;
            case 'ctime':
              return fs.statSync(p).ctime;
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
        return `File operation '${operations}' failed. Check logs for details. context: ${JSON.stringify(context)}`;
      }
    },
  },
}
