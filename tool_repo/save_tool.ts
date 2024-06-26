({ tool, path }, api) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const name = Object.keys(tool)[0];
                yield fs.writeFile(path, `module.exports = ${JSON.stringify(tool, null, 2)};`);
                return name;
            }
            catch (error) {
                throw new Error(`Failed to save tool: ${error.message} Tool source: ${error.stack}`);
            }
        })