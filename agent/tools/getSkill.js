const fs = require('fs');
const util = require('util');
const readdirAsync = util.promisify(fs.readdir);

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'get_Skill_details',
            description: 'get the details of how to perform a skill',
            parameters: {
                type: 'object',
                properties: {
                    skill: {
                        type: 'string',
                        description: 'The name of the skill to get'
                    }
                },
                required: ['skill']
            }
        },
    },
    function: async ({ skill }) => {
        try {
            if (!fs.existsSync(`./skills.json`)) {
                fs.writeFileSync(`./skills.json`, '{}');
            }
            const skills = JSON.parse(fs.readFileSync(`./skills.json`));
            const skillDetail = JSON.stringify(skills[skill]);
            return skillDetail;
        } catch (err) {
            return JSON.stringify(err.message);
        }
    }
}