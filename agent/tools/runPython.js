module.exports =  {
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
        const { exec } = await import('child_process');
        const fs = await import('fs');
        const path = await import('path');
        return new Promise((resolve, reject) => {
            const fileName = path.join(__dirname, new Date().getTime() + ".py");
            fs.writeFileSync(fileName, python);
            exec(`python ${fileName}`, (error, stdout, stderr) => {
                fs.unlinkSync(fileName);
                if (error) {
                    reject(error.message);
                } else if (stderr) {
                    reject(stderr);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}