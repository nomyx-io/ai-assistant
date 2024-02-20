"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = (assistant) => ({
    state: {
        modules: [{
                name: 'files',
                description: 'File manipulation tools',
                version: '0.0.1',
            }],
    },
    schemas: [
        { "type": 'function', "function": { "name": 'get_file_tree', "description": 'Return a tree of files and folders `n` levels deep from the specified `path`.', "parameters": { "type": 'object', "properties": { "value": { "type": 'string', "description": 'The directory path from which to start the exploration.' }, n: { "type": 'number', "description": 'The depth of exploration.' } }, "required": ['path', 'n'] } } },
        { "type": "function", "function": { "name": "file", "description": "Read, write, modify, and delete a file on the system. Supported operations are read, write, append, prepend, replace, insert_at, remove, delete, and copy.", "parameters": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, copy, attach, list_attached, detach." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } },
        { "type": "function", "function": { "name": "files", "description": "Perform batch operations on files", "parameters": { "type": "object", "properties": { "operations": { "type": "array", "description": "The operations to perform on the files.", "items": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, and copy." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } }, "required": ["operations"] } } },
    ],
    tools: {
        file: async function ({ operation, path, match, data, position, target }, state) {
            const fs = require('fs');
            const pathModule = require('path');
            const cwd = process.cwd();
            try {
                const p = pathModule.join(cwd, (path || ''));
                const t = pathModule.join(cwd, (target || ''));
                if (!fs.existsSync(p || t)) {
                    return `Error: File not found at path ${p || t}`;
                }
                let text = fs.readFileSync(p, 'utf8');
                switch (operation) {
                    case 'read':
                        return text;
                    case 'write':
                        text += data;
                        break;
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
                    case 'attach':
                        await (async ({ path }, state) => {
                            path = pathModule.join(__dirname, '..', (path || ''));
                            const extension = path.split('.').pop();
                            if (!fs.existsSync(path)) {
                                return `Error: File ${path} does not exist`;
                            }
                            try {
                                const supportedFormats = ['c', 'cpp', 'csv', 'docx', 'html', 'java', 'json', 'md', 'pdf', 'php', 'pptx', 'py', 'rb', 'tex', 'txt', 'css', 'jpeg', 'jpg', 'js', 'gif', 'png', 'tar', 'ts', 'xlsx', 'xml', 'zip'];
                                if (!extension || !supportedFormats.includes(extension)) {
                                    return `Error: File ${path} has an unsupported format`;
                                }
                                const ret = assistant.attachFile(path);
                                return ret && `Successfully attached file ${path} to assistant ${assistant.name}` || `Error attaching file ${path} to assistant ${assistant.name}`;
                            }
                            catch (err) {
                                return `Error attaching file ${path} to assistant ${assistant.name}: ${err.message}`;
                            }
                        })({ path }, assistant);
                        break;
                    case 'list_attached':
                        await (async (_dummy, assistant) => {
                            try {
                                if (!assistant) {
                                    return `Error: Could not create assistant`;
                                }
                                const myAssistantFiles = await assistant.listFiles();
                                return JSON.stringify(myAssistantFiles);
                            }
                            catch (err) {
                                return `Error: ${err.message}`;
                            }
                        })(null, assistant);
                        break;
                    case 'detach':
                        await (async ({ path }, assistant) => {
                            path = pathModule.join(__dirname, '..', (path || ''));
                            if (!fs.existsSync(path)) {
                                return `Error: File ${path} does not exist`;
                            }
                            try {
                                const ret = assistant.detachFile(path);
                                return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                            }
                            catch (err) {
                                return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`;
                            }
                        })({ path }, assistant);
                        break;
                    default:
                        return `Error: Unsupported operation ${operation}`;
                }
                fs.writeFileSync(p, text);
                return `Successfully executed ${operation} operation on file at path ${p}`;
            }
            catch (error) {
                return `Error: ${error.message}`;
            }
        },
        files: async function ({ operations }, run) {
            try {
                const fs = require('fs');
                const pathModule = require('path');
                const cwd = process.cwd();
                for (const { operation, path, match, data, position, target } of operations) {
                    const p = pathModule.join(cwd, (path || ''));
                    const t = pathModule.join(cwd, (target || ''));
                    if (!fs.existsSync(p || t)) {
                        return `Error: File not found at path ${p || t}`;
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
                        case 'attach':
                            await (async ({ path }, assistant) => {
                                path = pathModule.join(__dirname, '..', (path || ''));
                                const extension = path.split('.').pop();
                                if (!fs.existsSync(path)) {
                                    return `Error: File ${path} does not exist`;
                                }
                                try {
                                    const supportedFormats = ['c', 'cpp', 'csv', 'docx', 'html', 'java', 'json', 'md', 'pdf', 'php', 'pptx', 'py', 'rb', 'tex', 'txt', 'css', 'jpeg', 'jpg', 'js', 'gif', 'png', 'tar', 'ts', 'xlsx', 'xml', 'zip'];
                                    if (!extension || !supportedFormats.includes(extension)) {
                                        return `Error: File ${path} has an unsupported format`;
                                    }
                                    const ret = assistant.attachFile(path);
                                    return ret && `Successfully attached file ${path} to assistant ${assistant.name}` || `Error attaching file ${path} to assistant ${assistant.name}`;
                                }
                                catch (err) {
                                    return `Error attaching file ${path} to assistant ${assistant.name}: ${err.message}`;
                                }
                            })({ path }, assistant);
                            break;
                        case 'list_attached':
                            await (async (_dummy, assistant) => {
                                try {
                                    if (!assistant) {
                                        return `Error: Could not create assistant`;
                                    }
                                    const myAssistantFiles = await assistant.listFiles();
                                    return JSON.stringify(myAssistantFiles);
                                }
                                catch (err) {
                                    return `Error: ${err.message}`;
                                }
                            })(null, assistant);
                            break;
                        case 'detach':
                            await (async ({ path }, assistant) => {
                                path = pathModule.join(__dirname, '..', (path || ''));
                                if (!fs.existsSync(path)) {
                                    return `Error: File ${path} does not exist`;
                                }
                                try {
                                    const ret = assistant.detachFile(path);
                                    return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                                }
                                catch (err) {
                                    return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`;
                                }
                            })({ path }, assistant);
                            break;
                        default:
                            return `Error: Unsupported operation ${operation}`;
                    }
                    fs.writeFileSync(p, text);
                }
                return `Successfully executed batch operations on files`;
            }
            catch (error) {
                return `Error: ${error.message}`;
            }
        },
        get_file_tree: async ({ value, n }, state) => {
            const fs = require('fs');
            const pathModule = require('path');
            const cwd = process.cwd();
            const explore = (dir, depth) => {
                dir = pathModule.join(cwd, (dir || ''));
                if (depth < 0)
                    return null;
                const directoryTree = { path: dir, children: [] };
                try {
                    const fsd = fs.readdirSync(dir, { withFileTypes: true });
                    fsd.forEach((dirent) => {
                        const fullPath = pathModule.join(dir, dirent.name); // Use pathModule instead of path
                        // ignore node_modules and .git directories
                        if (dirent.isDirectory() && (dirent.name === 'node_modules' || dirent.name === '.git'))
                            return;
                        if (dirent.isDirectory()) {
                            directoryTree.children.push(explore(fullPath, depth - 1));
                        }
                        else {
                            directoryTree.children.push({ path: fullPath });
                        }
                    });
                }
                catch (e) {
                    return e.message;
                }
                return directoryTree;
            };
            return explore(value, n);
        }
    }
});
exports.default = module.exports;
//# sourceMappingURL=files.js.map