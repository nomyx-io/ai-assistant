module.exports = (assistant: any) => ({
    state: {
        modules: [{
            name: 'files',
            description: 'File manipulation tools',
            version: '0.0.1',
        }],
    },
    schemas: [
    ],
    tools: {
        file: async function ({ operation, path, match, data, position, target }: any, state: any) {
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
                        await (async({ path }, state) => {
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
                            } catch (err: any) {
                                return `Error attaching file ${path} to assistant ${assistant.name}: ${err.message}`
                            }
                        })({ path }, assistant);
                        break;
                    case 'list_attached':
                        await(async(_dummy, assistant) => {
                            try {
                                if (!assistant) {
                                    return `Error: Could not create assistant`;
                                }
                                const myAssistantFiles = await assistant.listFiles();
                                return JSON.stringify(myAssistantFiles);
                            } catch (err: any) {
                                return `Error: ${err.message}`
                            }
                        })(null, assistant);
                        break;
                    case 'detach':
                        await(async({ path }, assistant) => {
                            path = pathModule.join(__dirname, '..', (path || ''));
                            if (!fs.existsSync(path)) {
                                return `Error: File ${path} does not exist`;
                            }
                            try {
                                const ret = assistant.detachFile(path);
                                return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                            } catch (err: any) {
                                return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`
                            }
                        })({ path }, assistant);
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
        files: async function ({ operations }: any, run: any) {
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
                            await (async({ path }, assistant) => {
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
                                } catch (err: any) {
                                    return `Error attaching file ${path} to assistant ${assistant.name}: ${err.message}`
                                }
                            })({ path }, assistant);
                            break;
                        case 'list_attached':
                            await(async(_dummy, assistant) => {
                                try {
                                    if (!assistant) {
                                        return `Error: Could not create assistant`;
                                    }
                                    const myAssistantFiles = await assistant.listFiles();
                                    return JSON.stringify(myAssistantFiles);
                                } catch (err: any) {
                                    return `Error: ${err.message}`
                                }
                            })(null, assistant);
                            break;
                        case 'detach':
                            await(async({ path }, assistant) => {
                                path = pathModule.join(__dirname, '..', (path || ''));
                                if (!fs.existsSync(path)) {
                                    return `Error: File ${path} does not exist`;
                                }
                                try {
                                    const ret = assistant.detachFile(path);
                                    return ret && `Successfully detached file ${path} from assistant ${assistant.name}` || `Error detaching file ${path} from assistant ${assistant.name}`;
                                } catch (err: any) {
                                    return `Error detaching file ${path} from assistant ${assistant.name}: ${err.message}`
                                }
                            })({ path }, assistant);
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
        get_file_tree: async ({ value, n }: any, state: any) => {
            const fs = require('fs');
            const pathModule = require('path');
            const cwd = process.cwd();
            const explore = (dir: any, depth: any) => {
                dir = pathModule.join(cwd, (dir || ''))
                if (depth < 0) return null;
                const directoryTree: any = { path: dir, children: [] };
                try{
                    const fsd = fs.readdirSync(dir, { withFileTypes: true })
                    fsd.forEach((dirent: any) => {
                        const fullPath = pathModule.join(dir, dirent.name); // Use pathModule instead of path
                        // ignore node_modules and .git directories
                        if (dirent.isDirectory() && (dirent.name === 'node_modules' || dirent.name === '.git')) return;
                        if (dirent.isDirectory()) {
                            directoryTree.children.push(explore(fullPath, depth - 1));
                        } else {
                            directoryTree.children.push({ path: fullPath });
                        }
                    });
                } catch (e: any) { 
                    return e.message;
                }
                return directoryTree;
            };
            return explore(value, n);
        }
    }
})
export default module.exports;