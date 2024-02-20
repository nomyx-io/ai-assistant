"use strict";
const fs = require('fs');
function getOrCreateFile(filename, defaultContent) {
    if (!fs.existsSync(filename)) {
        fs.writeFileSync(filename, defaultContent);
    }
    return fs.readFileSync(filename, 'utf-8');
}
module.exports = {
    state: {
        modules: [{
                name: 'learnedskills',
                description: 'Learned Skills',
                version: '0.0.1',
            }],
    },
    schemas: [
        { "type": "function", "function": { "name": "learned_skills_list", "description": "list all the learned skills that you have", "parameters": {} } },
        { "type": "function", "function": { "name": "learned_skill_details", "description": "get the details of how to perform a learned skill", "parameters": { "type": "object", "properties": { "skill": { "type": "string", "description": "The name of the skill to get" } }, "required": ["skill"] } } },
        { "type": "function", "function": { "name": "learned_skill_save_details", "description": "save the details of how to perform a learned skill", "parameters": { "type": "object", "properties": { "skill": { "type": "string", "description": "The name of the skill to get" }, "skillDetail": { "type": "string", "description": "The details of the skill" } }, "required": ["skill", "skillDetail"] } } }
    ],
    tools: {
        learned_skills_list: async () => {
            try {
                return getOrCreateFile('./skills.json', '{}');
            }
            catch (err) {
                return JSON.stringify(err.message);
            }
        },
        learned_skill_details: async ({ skill }) => {
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
        },
        learned_skill_save_details: async ({ skill, skillDetail }) => {
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
        }
    }
};
//# sourceMappingURL=learnedskills.js.map