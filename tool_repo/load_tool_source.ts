({ path }, api) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const tool = yield fs.readFile(path, 'utf8');
                return tool;
            }
            catch (error) {
                throw new Error(`Failed to load tool source: ${error.message} Tool source: ${error.stack}`);
            }
        })