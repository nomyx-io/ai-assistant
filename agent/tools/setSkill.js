const fs = require('fs');
const util = require('util');
const readdirAsync = util.promisify(fs.readdir);

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'setSkill',
            description: 'set the details of how to perform a skill',
            parameters: {
                type: 'object',
                properties: {
                    skill: {
                        type: 'string',
                        description: 'The name of the skill to get'
                    },
                    skillDetail: {
                        type: 'string',
                        description: 'The details of the skill'
                    }
                },
                required: ['skill', 'skillDetail']
            }
        },
    },
    function: async ({ skill, skillDetail }) => {
        try {
            if (!fs.existsSync(`./skills.json`)) {
                fs.writeFileSync(`./skills.json`, '{}');
            }
            const skills = JSON.parse(fs.readFileSync(`./skills.json`));
            skills[skill] = skillDetail;
            fs.writeFileSync(`./skills.json`, JSON.stringify(skills));
            return `Successfully set skill ${skill}}`
        } catch (err) {
            return JSON.stringify(err.message);
        }
    }
}