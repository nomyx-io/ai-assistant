"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
function getOrCreateFile(filename, defaultContent) {
    if (!fs.existsSync(filename)) {
        fs.writeFileSync(filename, defaultContent);
    }
    return fs.readFileSync(filename, 'utf-8');
}
module.exports = {
    enabled: false,
    tools: {
        learned_skills_list: {
            sschema: { "type": "function", "function": { "name": "learned_skills_list", "description": "list all the learned skills that you have available", "parameters": {} } },
            action: () => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    return getOrCreateFile('./skills.json', '{}');
                }
                catch (err) {
                    return JSON.stringify(err.message);
                }
            })
        },
        learned_skill_details: {
            schema: { "type": "function", "function": { "name": "learned_skill_details", "description": "get the details of how to perform a learned skill", "parameters": { "type": "object", "properties": { "skill": { "type": "string", "description": "The name of the skill to get" } }, "required": ["skill"] } } },
            action: ({ skill }) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const sf = getOrCreateFile('./skills.json', '{}');
                    const skills = JSON.parse(sf.toString());
                    const skillDetail = skills[skill];
                    if (!skillDetail) {
                        return `Skill ${skill} not found`;
                    }
                    return skillDetail;
                }
                catch (err) {
                    return JSON.stringify(err.message);
                }
            })
        },
        learned_skill_save_details: {
            schema: { "type": "function", "function": { "name": "learned_skill_save_details", "description": "save the details of how to perform a learned skill", "parameters": { "type": "object", "properties": { "skill": { "type": "string", "description": "The name of the skill to get" }, "skillDetail": { "type": "string", "description": "The details of the skill" } }, "required": ["skill", "skillDetail"] } } },
            action: ({ skill, skillDetail }) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const sf = getOrCreateFile('./skills.json', '{}');
                    const skills = JSON.parse(sf.toString());
                    skills[skill] = skillDetail;
                    fs.writeFileSync('./skills.json', JSON.stringify(skills));
                    return `Skill ${skill} set`;
                }
                catch (err) {
                    return JSON.stringify(err.message);
                }
            })
        },
        learned_skills_help: {
            schema: { "type": "function", "function": { "name": "learned_skills_help", "description": "get help for the learned skills module", "parameters": {} } },
            action: () => __awaiter(void 0, void 0, void 0, function* () {
                return `This module allows you to store and retrieve learned skills. You can list all the learned skills, get the details of a specific skill, and save the details of a specific skill. Skills are deployed using the OpenAI assistant API or the OpenAI chat completion API depending on the skill complexity.`;
            })
        }
    }
};
exports.default = module.exports;
