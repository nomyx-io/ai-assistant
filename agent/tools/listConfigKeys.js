const fs = require('fs');
const path = require('path');

// Define the path to the config file
const CONFIG_FILE_PATH = path.join(__dirname, 'config.json');

/**
 * This tool retrieves a list of keys from the config file.
 *
 * @toolType utility
 * @hasSideEffect false
 * @returns {Array<string>} An array of all config keys from the config file.
 */
function listConfigKeys() {
    try {    
      let keys = [];
      if (fs.existsSync(CONFIG_FILE_PATH)) {
          // Read and parse the config file
          const config = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf8'));
          // Retrieve all keys from the config object
          keys = Object.keys(config);
      }
      return JSON.stringify(keys);
    } catch (err) {
      return JSON.stringify(err.message);
    }
}

module.exports = {
  schema: {
    type: 'function',
    function: {
        name: 'list_config_keys',
        description: 'list all config keys',
        parameters: {
        }
    },
  },
  function: listConfigKeys
}