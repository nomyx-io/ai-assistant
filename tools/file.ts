import AssistantAPI from '../assistant/assistant';
import pathModule from 'path';
import fs from 'fs/promises';

const cwd = process.cwd();

module.exports = {
    state: {
        modules: [{
            name: "news",
            description: "News Search",
            version: "0.0.1"
        }]
    },
    schemas: [
        { type: 'function', function: { name: 'get_file_tree', "description": 'Return a tree of files and folders `n` levels deep from the specified `path`.', "parameters": { "type": 'object', "properties": { "value": { "type": 'string', "description": 'The directory path from which to start the exploration.' }, n: { "type": 'number', "description": 'The depth of exploration.' } }, "required": ['path', 'n'] } } },
        { type: "function", function: { name: "file", "description": "Read, write, modify, and delete a file on the system. Supported operations are read, write, append, prepend, replace, insert_at, remove, delete, and copy.", "parameters": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, copy, attach, list_attached, detach." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } },
        { type: "function", function: { name: "files", "description": "Perform batch operations on files", "parameters": { "type": "object", "properties": { "operations": { "type": "array", "description": "The operations to perform on the files.", "items": { "type": "object", "properties": { "operation": { "type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, and copy." }, "path": { "type": "string", "description": "The path to the file to perform the operation on." }, "match": { "type": "string", "description": "The string to match in the file. Regular expressions are supported." }, "data": { "type": "string", "description": "The data to write to the file." }, "position": { "type": "number", "description": "The position at which to perform the operation." }, "target": { "type": "string", "description": "The path to the target file." } }, "required": ["operation", "path"] } } }, "required": ["operations"] } } },
    ],
    tools: {
        get_file_tree: {
            action: async ({ value, n }: any, state: any) => {            
                const explore = async (dir: string, depth: number) => {
                    // Check if 'dir' is an absolute path. If not, join it with 'cwd'.
                    dir = pathModule.isAbsolute(dir) ? dir : pathModule.join(cwd, dir || '');
                    if (depth < 0) return null;
                    const directoryTree: any = { path: dir, children: [] };
                    try {
                        const filesAndDirs = await fs.readdir(dir, { withFileTypes: true });
                        for (const dirent of filesAndDirs) {
                            const fullPath = pathModule.join(dir, dirent.name);
                            // Ignore node_modules and .git directories
                            if (dirent.isDirectory() && (dirent.name === 'node_modules' || dirent.name === '.git')) continue;
                            // If the dirent is a directory, recursively explore it
                            if (dirent.isDirectory()) {
                                const childDirectory = await explore(fullPath, depth - 1);
                                if (childDirectory) directoryTree.children.push(childDirectory);
                            } else {
                                directoryTree.children.push({ path: fullPath });
                            }
                        }
                    } catch (e: any) {
                        console.error(`Error reading directory ${dir}: ${e.message}`);
                        return { error: e.message, path: dir };
                    }
                    return directoryTree;
                };
                
            
                return explore(value || '.', n);
            },
            nextState: null
        },
        file: {
            action: async ({ operation, path, match, data, position, target }: any, state: any, assistantAPI: any) =>{
                const cwd = process.cwd();
                const pathModule = require('path');
                const fs = require('fs/promises');
                const { promisify } = require('util');
                const stat = promisify(fs.stat);
                try {
                    const p = !pathModule.isAbsolute(path) ? pathModule.join(cwd, (path || '')) : path;
                    const t = !pathModule.isAbsolute(path) ? pathModule.join(cwd, (target || '')) : target;
                    let text;
                    // is this a folder?
                    if (await require('fs').lstatSync(p).isDirectory()) {
                        // then read the folder
                        text = await fs.readdir(p);
                    } else {
                        // else read the file
                        text = await fs.readFile(p, 'utf8');
                    }
                    switch (operation) {
                        case 'read':
                            // is this a folder?
                            if (await require('fs').lstatSync(p).isDirectory()) {
                                // then read the folder
                                const files = await fs.readdir(p);
                                return files.map((file: string) => pathModule.join(p, file));
                            } else {
                                // else read the file
                                return text;
                            }
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
                            await fs.unlink(p);
                            break;
                        case 'copy':
                            await fs.copyFile(p, t);
                            break;
                        case 'attach':
                            await (async ({ path }, state) => {
                                path = pathModule.join(__dirname, '..', (path || ''));
                                const extension = path.split('.').pop();
                                if (!await require('fs').exists(path)) {
                                    return `Error: File ${path} does not exist`;
                                }
                                try {
                                    const supportedFormats = ['c', 'cpp', 'csv', 'docx', 'html', 'java', 'json', 'md', 'pdf', 'php', 'pptx', 'py', 'rb', 'tex', 'txt', 'css', 'jpeg', 'jpg', 'js', 'gif', 'png', 'tar', 'ts', 'xlsx', 'xml', 'zip'];
                                    if (!extension || !supportedFormats.includes(extension)) {
                                        return `Error: File ${path} has an unsupported format`;
                                    }
                                    const ret = await assistantAPI.attachFile(path);
                                    return ret && `Successfully attached file ${path} to assistant ${assistantAPI.name}` || `Error attaching file ${path} to assistant ${assistantAPI.name}`;
                                } catch (err: any) {
                                    return `Error attaching file ${path} to assistant ${assistantAPI.name}: ${err.message}`
                                }
                            })({ path }, this);
                            break;
                        case 'list_attached':
                            await (async (_dummy, assistant) => {
                                try {
                                    if (!assistant) {  return `Error: Could not create assistant`; }
                                    const myAssistantFiles = await assistantAPI.callAPI('files', 'list', { thread_id: state.thread.thread_id });
                                    return JSON.stringify(myAssistantFiles);
                                } catch (err: any) {
                                    return `Error: ${err.message}`
                                }
                            })(null, this);
                            break;
                        case 'detach':
                            await (async ({ path }, assistant) => {
                                path = pathModule.join(__dirname, '..', (path || ''));
                                if (!await require('fs').exists(path)) { return `Error: File ${path} does not exist`; }
                                try {
                                    const ret = await assistantAPI.callAPI('files', 'delete', { thread_id: state.thread.id, file_id: path });
                                    return ret && `Successfully detached file ${path} from assistant ${assistantAPI.name}` || `Error detaching file ${path} from assistant ${assistantAPI.name}`;
                                } catch (err: any) {
                                    return `Error detaching file ${path} from assistant ${assistantAPI.name}: ${err.message}`
                                }
                            })({ path }, this);
                            break;
                        default:
                            return `Error: Unsupported operation ${operation}`;
                    }
                    await await fs.writeFile(p, text);
                    return `Successfully executed ${operation} operation on file ${p}`;
                } catch (error: any) {
                    return `Error: ${error.message}`
                }
            },
            nextState: null
        },
        files: {
            action: async function ({ operations }: any, run: any) {
                try {
                    for (const { operation, path, match, data, position, target } of operations) {
                        const p = !pathModule.isAbsolute(path) ? pathModule.join(cwd, (path || '')) : path;
                        const t = !pathModule.isAbsolute(path) ? pathModule.join(cwd, (target || '')) : target;
                        let text = await fs.readFile(p, 'utf8');
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
                                await fs.unlink(p);
                                break;
                            case 'copy':
                                await fs.copyFile(p, t);
                                break;
                            case 'attach':
                                await (async ({ path }, self: AssistantAPI) => {
                                    path = pathModule.join(__dirname, '..', (path || ''));
                                    const extension = path.split('.').pop();
                                    if (!await require('fs').exists(path)) {
                                        return `Error: File ${path} does not exist`;
                                    }
                                    try {
                                        const supportedFormats = ['c', 'cpp', 'csv', 'docx', 'html', 'java', 'json', 'md', 'pdf', 'php', 'pptx', 'py', 'rb', 'tex', 'txt', 'css', 'jpeg', 'jpg', 'js', 'gif', 'png', 'tar', 'ts', 'xlsx', 'xml', 'zip'];
                                        if (!extension || !supportedFormats.includes(extension)) {
                                            return `Error: File ${path} has an unsupported format`;
                                        }
                                        const ret = await self.attachFile(path);
                                        return ret && `Successfully attached file ${path} to assistant ${self.name}` || `Error attaching file ${path} to assistant ${self.name}`;
                                    } catch (err: any) {
                                        return `Error attaching file ${path} to assistant ${self.name}: ${err.message}`
                                    }
                                })({ path }, self as any);
                                break;
                            case 'list_attached':
                                await (async (_dummy, assistant: AssistantAPI) => {
                                    try {
                                        if (!assistant) {
                                            return `Error: Could not create assistant`;
                                        }
                                        const myAssistantFiles = await assistant.listFiles();
                                        return JSON.stringify(myAssistantFiles);
                                    } catch (err: any) {
                                        return `Error: ${err.message}`
                                    }
                                })(null, self as any);
                                break;
                            case 'detach':
                                await (async ({ path }, assistant : AssistantAPI) => {
                                    path = pathModule.join(__dirname, '..', (path || ''));
                                    if (!await require('fs').exists(path)) {
                                        return `Error: File ${path} does not exist`;
                                    }
                                    try {
                                        const ret = await assistant.detachFile(path);
                                        return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                                    } catch (err: any) {
                                        return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`
                                    }
                                })({ path }, self as any);
                                break;
                            default:
                                return `Error: Unsupported operation ${operation}`;
                        }
                        await fs.writeFile(p, text);
                    }
                    return `Successfully executed batch operations on files`;
                } catch (error: any) {
                    return `Error: ${error.message}`
                }
            },
            nextState: null
        },
    }
}

export default module.exports;