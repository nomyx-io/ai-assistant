({ path }, api) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const toolModule = require(path);
                const toolName = toolModule.name; // Assuming the tool module exports its name
                api.toolRegistry.addTool(toolName, toolModule.source, toolModule.schema, toolModule.tags || []);
                return toolName;
            }
            catch (error) {
                throw new Error(`Failed to load tool: ${error.message} Tool source: ${error.stack}`);
            }
        })