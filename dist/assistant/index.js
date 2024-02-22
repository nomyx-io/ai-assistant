"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tools = void 0;
const assistant_1 = __importDefault(require("./assistant"));
exports.default = assistant_1.default;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function loadModulesFromDirectory(directoryPath) {
    try {
        const files = fs_1.default.readdirSync(directoryPath);
        const jsFiles = files.filter(file => file.endsWith('.js'));
        const modules = [];
        for (const file of jsFiles) {
            const filePath = path_1.default.join(directoryPath, file);
            try {
                const module = require(filePath);
                modules.push(module);
                console.log(`Module ${file} loaded successfully.`);
            }
            catch (err) {
                console.error(`Error loading module ${file}:`, err);
            }
        }
        return modules;
    }
    catch (err) {
        console.error('Failed to read directory:', err);
        throw err; // Rethrow or handle as needed
    }
}
// Example usage
const directoryPath = path_1.default.join(__dirname, '.', 'tools');
exports.tools = loadModulesFromDirectory(directoryPath);
//# sourceMappingURL=index.js.map