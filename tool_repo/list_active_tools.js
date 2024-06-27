class list_active_toolsTool {

  async execute(params, api) {
    return Object.keys(api.tools);
  }

}

module.exports = new list_active_toolsTool();