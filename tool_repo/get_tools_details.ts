(params, api) => __awaiter(void 0, void 0, void 0, function* () {
            const { tools } = params;
            const toolsDetails = yield Promise.all(tools.map((tool) => __awaiter(void 0, void 0, void 0, function* () {
                return yield api.callTool('get_tool_details', { tool });
            })));
            return toolsDetails;
        })