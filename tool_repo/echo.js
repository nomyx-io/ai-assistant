class echoTool {

  async execute({ text }, api) {
    api.emit('text', text);
    return text;
  }

}

module.exports = new echoTool();