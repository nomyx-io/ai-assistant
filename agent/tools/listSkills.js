const fs = require('fs');
module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'listSkills',
            description: 'list all the learned skills in the agent',
            parameters: {
            }
        },
    },
    function: async () => {
        try {
            if (!fs.existsSync(`./skills.json`)) {
                fs.writeFileSync(`./skills.json`, '{}');
            }
            const skills = JSON.parse(fs.readFileSync(`./skills.json`));
            return JSON.stringify(Object.keys(skills))
        } catch (err) {
            return JSON.stringify(err.message);
        }
    }
}