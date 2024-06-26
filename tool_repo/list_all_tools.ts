(params, api) => __awaiter(void 0, void 0, void 0, function* () {
            const toolsHome = yield api.callTool('get_tools_home', {});
            //const tools = fs.readdirSync(toolsHome).filter((file: string) => file.endsWith('.ts')).map((file: string) => file.replace('.ts', ''));
            const tools = yield fs.readdir(toolsHome);
            return tools;
        })