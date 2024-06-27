class RegistryManagementTool {
    constructor() {
        this.name = 'registryManagementTool';
        this.description = 'Manage the tool registry';
        this.schema = {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['list', 'add', 'update', 'rollback', 'history']
                },
                name: { type: 'string' },
                source: { type: 'string' },
                tags: {
                    type: 'array',
                    items: { type: 'string' }
                },
                version: { type: 'string' }
            },
            required: ['action']
        };
    }

    async execute(params, api) {
        if (!Array.isArray(params)) params = [params];
        const results = [];
        for (const param of params) {
            debugLog(`registryManagementTool called with params: ${JSON.stringify(params)}`);
            const confirmed = await confirmExecution(api, `Add tool '${param.name}' with the provided source and tags?`);
            if (!confirmed) {
                return false;
            }
            const callFunction = async (params) => {
                const { action, name, source, schema, tags, version } = params;
                switch (action) {
                    case 'list':
                        return api.getToolList();
                    case 'add':
                        debugLog(`Adding tool: ${name} with source: ${source} and tags: ${tags}`);
                        return api.addTool(name, source, schema, tags);
                    case 'update':
                        debugLog(`Updating tool: ${name} with source: ${source}`);
                        return api.updateTool(name, source);
                    case 'rollback':
                        debugLog(`Rolling back tool: ${name} to version: ${version}`);
                        return api.rollbackTool(name, version);
                    case 'history':
                        return api.getToolHistory(name);
                    default:
                        throw new Error(`Invalid action: ${action}`);
                }
            };
            results.push(await callFunction(param));
        }
        return results;
    }
}

module.exports = new RegistryManagementTool();