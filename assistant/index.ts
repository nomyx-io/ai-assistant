import AssistantAPI from "./assistant";
export default AssistantAPI;

import fs from 'fs';
import path from 'path';

function loadModulesFromDirectory(directoryPath: string) {
    try {
        const files = fs.readdirSync(directoryPath);
        const jsFiles = files.filter(file => file.endsWith('.js'));

        const modules: any = [];

        for (const file of jsFiles) {
            const filePath = path.join(directoryPath, file);
            try {
                const module = require(filePath);
                modules.push(module);
                console.log(`Module ${file} loaded successfully.`);
            } catch (err) {
                console.error(`Error loading module ${file}:`, err);
            }
        }

        return modules;
    } catch (err) {
        console.error('Failed to read directory:', err);
        throw err; // Rethrow or handle as needed
    }
}

// Example usage
const directoryPath = path.join(__dirname, '.', 'tools');

export const tools = loadModulesFromDirectory(directoryPath);
