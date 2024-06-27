class Echo {
  constructor() {
    this.name = "echo";
    this.description = "Print the given text to the console";
    this.inputSchema = {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to print"
        }
      },
      required: ["text"]
    };
  }

  async execute({ text }, api) {
    api.emit('text', text);
    return text;
  }
}

module.exports = Echo;