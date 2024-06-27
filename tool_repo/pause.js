class PauseTool {
  name = 'pause';
  description = 'Pause execution for the specified duration.';
  async pause(duration) {
    return await new Promise((resolve) => setTimeout(resolve, duration));
  }
}

module.exports = { PauseTool };