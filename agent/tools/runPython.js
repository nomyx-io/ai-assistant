const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const hljs = require('highlight.js');

module.exports = {
    schema: {
        type: "function",
        function: {
            name: "runPython",
            description: "execute arbitrary Python code and return the result",
            parameters: {
                type: "object",
                properties: {
                    python: {
                        type: "string",
                        description: "Python code to run"
                    }
                },
                required: ["python"]
            }
        }
    },
    function: async ({ python }) => {
        return new Promise((resolve, _reject) => {
            try {
                const fileName = path.join(__dirname, new Date().getTime() + ".py");
                fs.writeFileSync(fileName, python);
                exec(`python ${fileName}`, (error, stdout, stderr) => {
                    fs.unlinkSync(fileName);
                    if (error) {
                        resolve(error.message);
                    } else if (stderr) {
                        resolve(JSON.stringify(stderr));
                    } else {
                        resolve(JSON.stringify(stdout));
                    }
                });
            } catch (err) {
                resolve(err.message);
            }
        });
    }
}