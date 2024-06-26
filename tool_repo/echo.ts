({ text }, api) => __awaiter(void 0, void 0, void 0, function* () {
            api.emit('text', text);
            return text;
        })