module.exports = {
    enabled: true,
    tools: {
        "get-file-tree": {
            schema: { type: 'function', function: { name: 'get-file-tree', description: 'Get the file tree of the directory at the given path', parameters: { type: 'object', properties: { path: { type: 'string', description: 'The path of the directory to explore' }, n: { type: 'integer', description: 'The depth of the directory tree to explore' } } } } },
            action: async ({ path, n }: any) => {
                try {
                    const cwd = process.cwd();
                    const pathModule = require('path');
                    const thePath = path.slice(0, 1) === '/' ? path : pathModule.join(cwd, (path || ''));
                    const dirTree = require("directory-tree");
                    const tree = dirTree(thePath, { depth: n });
                    // Return the tree or an appropriate message if no tree is generated
                    return tree || { message: "No directory tree could be generated for the given path and depth." };
                } catch (error: any) {
                    console.error(`Error generating directory tree: ${error.message}`);
                    return { error: error.message };
                }
            },
            nextState: null
        },
        "file": {
            schema: { type: 'function', function: { name: 'file', description: 'Perform operations on a file', parameters: { type: 'object', properties: { operation: { type: 'string', description: 'The operation to perform: read, write, append, prepend, replace, insert_at, remove, delete, copy, attach, list_attached, detach' }, path: { type: 'string', description: 'The path of the file to perform the operation on' }, match: { type: 'string', description: 'The string to match in the file' }, data: { type: 'string', description: 'The data to write to the file' }, position: { type: 'integer', description: 'The position to insert the data at' }, target: { type: 'string', description: 'The path of the target file for the copy operation' } }, required: ['operation'] } } },
            action: async ({ operation, path, match, data, position, target }: any, { thread }: any, assistantAPI: any) =>{
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
                            await (async ({ path }, { assistant }: any, api) => {
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
                                    const ret = await assistantAPI.attachFile(path);
                                    const asstId = assistant.id;
                                    return ret && `Successfully attached file ${path} to assistant ${asstId}` || `Error attaching file ${path} to assistant ${asstId}`;
                                } catch (err: any) {
                                    const asstId = assistant.id;
                                    return `Error attaching file ${path} to assistant ${asstId}: ${err.message}`
                                }
                            })({ path }, this);
                            break;
                        case 'list_attached':
                            await (async (_dummy, assistant) => {
                                try {
                                    if (!assistant) {  return `Error: Could not create assistant`; }
                                    const myAssistantFiles = await assistantAPI.callAPI('files', 'list', { thread_id: thread.thread_id });
                                    return JSON.stringify(myAssistantFiles);
                                } catch (err: any) {
                                    return `Error: ${err.message}`
                                }
                            })(null, this);
                            break;
                        case 'detach':
                            await (async ({ path }, { assistant } : any, api) => {
                                path = pathModule.join(__dirname, '..', (path || ''));
                                if (!fs.existsSync(path)) { return `Error: File ${path} does not exist`; }
                                try {
                                    const ret = await assistantAPI.callAPI('files', 'delete', { thread_id: thread.id, file_id: path });
                                    return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                                } catch (err: any) {
                                    return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`
                                }
                            })({ path }, this);
                            break;
                        default:
                            return `Error: Unsupported operation ${operation}`;
                    }
                    fs.writeFileSync(p, text);
                    return `Successfully executed ${operation} operation on file at path ${p}`;
                } catch (error: any) {
                    return `Error: ${error.message}`
                }
            },
            nextState: null
        },
        "files": {
            schema: { type: 'function', function: { name: 'files', description: 'Perform batch operations on files', parameters: { type: 'object', properties: { operations: { type: 'array', description: 'The operations to perform', items: { type: 'object', properties: { operation: { type: 'string', description: 'The operation to perform: read, write, append, prepend, replace, insert_at, remove, delete, copy' }, path: { type: 'string', description: 'The path of the file to perform the operation on' }, match: { type: 'string', description: 'The string to match in the file' }, data: { type: 'string', description: 'The data to write to the file' }, position: { type: 'integer', description: 'The position to insert the data at' }, target: { type: 'string', description: 'The path of the target file for the copy operation' } }, required: ['operation'] } } } } } },
            action: async function ({ operations }: any, run: any) {
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
                            default:
                                return `Error: Unsupported operation ${operation}`;
                        }
                        fs.writeFileSync(p, text);
                    }
                    return `Successfully executed batch operations on files`;
                } catch (error: any) {
                    return `Error: ${error.message}`
                }
            },
            nextState: null
        },
    }
};

export default module.exports;
