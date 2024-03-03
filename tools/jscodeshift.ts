const jscodeshift = require('jscodeshift');
const fs = require('fs');

module.exports = {
    enabled: true,
    tools: {
        transform_file: {
            schema: {
                "type": "function",
                "function": {
                    "name": "transform_file",
                    "description": "Apply a custom transformation to a JavaScript or TypeScript file",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "filePath": {
                                "type": "string",
                                "description": "The path to the source code file to transform"
                            },
                            "transformationFilePath": {
                                "type": "string",
                                "description": "The path to the file containing the transformation code"
                            }
                        },
                        "required": ["filePath", "transformationFilePath"]
                    }
                }
            },
            action: async ({ filePath, transformationFilePath }: any) => {
                try {
                    if (!fs.existsSync(filePath) || !fs.existsSync(transformationFilePath)) {
                        return `File not found.`;
                    }

                    const sourceCode = fs.readFileSync(filePath, 'utf8');
                    const transformationCode = fs.readFileSync(transformationFilePath, 'utf8');

                    const j = jscodeshift.withParser('babel'); // or 'tsx' for TypeScript
                    const root = j(sourceCode);

                    // Evaluate the transformation code and apply it
                    const transformation = new Function('j', 'root', transformationCode);
                    transformation(j, root);

                    // Optionally write back to the same file or a new file
                    fs.writeFileSync(filePath, root.toSource());

                    return `Transformation applied successfully.`;
                } catch (err: any) {
                    return JSON.stringify(err.message);
                }
            }
        },
        // Additional tools for specific file-based transformations can be defined here.
    }
};

export default module.exports;
