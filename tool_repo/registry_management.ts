(params, api) => __awaiter(void 0, void 0, void 0, function* () {
            if (!Array.isArray(params))
                params = [params];
            const results = [];
            for (const param of params) {
                (0, errorLogger_1.debugLog)(`registryManagementTool called with params: ${JSON.stringify(params)}`);
                const confirmed = yield (0, confirmation_1.confirmExecution)(api, `Add tool '\${name}' with the provided source and tags?`);
                if (!confirmed) {
                    return false;
                }
                const callFunction = (params) => __awaiter(void 0, void 0, void 0, function* () {
                    const { action, name, source, schema, tags, version } = params;
                    switch (action) {
                        case 'list':
                            return api.getToolList();
                        case 'add':
                            (0, errorLogger_1.debugLog)(`Adding tool: ${name} with source: ${source} and tags: ${tags}`);
                            return api.addTool(name, source, schema, tags);
                        case 'update':
                            (0, errorLogger_1.debugLog)(`Updating tool: ${name} with source: ${source}`);
                            return api.updateTool(name, source);
                        case 'rollback':
                            (0, errorLogger_1.debugLog)(`Rolling back tool: ${name} to version: ${version}`);
                            return api.rollbackTool(name, version);
                        case 'history':
                            return api.getToolHistory(name);
                        default:
                            throw new Error(`Invalid action: ${action}`);
                    }
                });
                results.push(yield callFunction(param));
            }
            return results;
        })