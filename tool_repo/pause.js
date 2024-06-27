class pauseTool {

  async execute({ duration }, api) {
    return await new Promise((resolve) => setTimeout(resolve, duration));
  }

}

module.exports = new pauseTool();