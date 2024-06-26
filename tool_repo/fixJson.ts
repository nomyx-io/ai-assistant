({ json, resultVar }, api) => __awaiter(void 0, void 0, void 0, function* () {
            const convo = new conversation_1.default('gemini');
            const sp = `Given some content that contains a JSON object or array, you ignore EVERYTHING BEFORE OR AFTER what is obviously JSON data, ignoring funky keys and weird data, and you output a syntactically-valid version of the JSON, with other quoting characters properly escaped, on a single line. If the content contains no JSON data, you output a JSON object containing the input data, structured in the most appropriate manner for the data.`;
            const tasks = yield convo.chat([
                {
                    role: 'system',
                    content: sp
                },
                {
                    role: 'user',
                    content: json,
                },
            ], {}, 'gemini-1.5-flash-001');
            let task = tasks.content[0].text;
            try {
                task = JSON.parse(task);
            }
            catch (error) {
                task = api.extractJson(task);
            }
            if (resultVar) {
                api.store[resultVar] = task;
            }
            return task;
        })