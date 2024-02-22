"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configManager = exports.ConfigurationManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const requireMain = require.main || { filename: __filename };
class ConfigurationManager {
    constructor() {
        this._config = this.loadConfig();
    }
    get applicationFolder() {
        let _appDir = path_1.default.dirname(requireMain.filename);
        const appDirParts = _appDir.split(path_1.default.sep);
        if (appDirParts[appDirParts.length - 1] === 'bin') {
            appDirParts.pop();
            _appDir = appDirParts.join(path_1.default.sep);
        }
        return _appDir;
    }
    static getInstance() {
        if (!ConfigurationManager._instance) {
            ConfigurationManager._instance = new ConfigurationManager();
        }
        return ConfigurationManager._instance;
    }
    loadConfig() {
        const appDir = path_1.default.dirname(requireMain.filename);
        if (fs_1.default.existsSync(path_1.default.join(__dirname, '..', 'config.json'))) {
            return JSON.parse(fs_1.default.readFileSync(path_1.default.join(appDir, '..', 'config.json'), 'utf8'));
        }
        else {
            return {
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
                PLAYHT_AUTHORIZATION: process.env.PLAYHT_AUTHORIZATION || '',
                PLAYHT_USER_ID: process.env.PLAYHT_USER_ID || '',
                PLAYHT_MALE_VOICE: process.env.PLAYHT_MALE_VOICE || '',
                PLAYHT_FEMALE_VOICE: process.env.PLAYHT_FEMALE_VOICE || '',
                GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
                GOOGLE_CX_ID: process.env.GOOGLE_CX_ID || '',
                NEWS_API_KEY: process.env.NEWS_API_KEY || '',
            };
        }
    }
    saveConfig(config) {
        const appDir = path_1.default.dirname(requireMain.filename);
        fs_1.default.writeFileSync(path_1.default.join(appDir, '..', 'config.json'), JSON.stringify(config, null, 2));
    }
    getConfig() { return this._config; }
    setConfig(config) { this._config = config; this.saveConfig(config); }
    getConfigValue(key) { return this._config[key]; }
}
exports.ConfigurationManager = ConfigurationManager;
exports.configManager = ConfigurationManager.getInstance();
//# sourceMappingURL=config-manager.js.map