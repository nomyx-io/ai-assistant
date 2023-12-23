const fs = require('fs');
const path = require('path');

// Example config file path; you might want to set your specific path or logic to determine it.
const CONFIG_FILE_PATH = path.join(__dirname, 'config.json');

/**
 * This tool sets a configuration value by key to a JSON config file.
 *
 * @toolType utility
 * @hasSideEffect true
 * @param {string} key - The config key to set.
 * @param {string|number|boolean|object} value - The value to set for the key.
 * @returns {void}
 */
function setConfigValue({key, value}) {
  let config = {};
  if (fs.existsSync(CONFIG_FILE_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf8'));
  }
  config[key] = value;
  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf8');
  retur `Set config key ${key} to ${value}`;
}

module.exports = {
  schema: {
      type: 'function',
      function: {
          name: 'set_config_value',
          description: 'set a configuration value by key',
          parameters: {
              type: 'object',
              properties: {
                  key: {
                      type: 'string',
                      description: 'The config key to set'
                  },
                  value: {
                      type: 'string',
                      description: 'The value to set for the key'
                  }
              },
              required: ['key', 'value']
          }
      },
  },
  function: setConfigValue
}