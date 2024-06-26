({ tool }, api) => __awaiter(void 0, void 0, void 0, function* () {
            const toolsHome = yield api.callTool('get_tools_home', {});
            const toolPath = `${toolsHome}/${tool}.ts`;
            const existsSync = require('fs').existsSync;
            if (!existsSync(toolPath)) {
                throw new Error(`The tool '${tool}' does not exist.`);
            }
            const toolModule = require(toolPath);
            return toolModule.schema;
        })