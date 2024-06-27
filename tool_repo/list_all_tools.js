class ListAllTools {
    constructor() {
        this.name = 'list_all_tools';
        this.description = 'List all the tools available in the tools home directory.';
        this.methodSignature = 'list_all_tools(): { type: \'array\', items: { name: \'string\' } }';
    }

    execute(params, api) {
        return __awaiter(this, void 0, void 0, function* () {
            const toolsHome = yield api.callTool('get_tools_home', {});
            const tools = yield fs.readdir(toolsHome);
            return tools;
        });
    }
}

module.exports = new ListAllTools();