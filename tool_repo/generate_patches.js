class GeneratePatches {
  constructor(api) {
    this.api = api;
  }

  async generate_patches({ files, instructions, resultVar }) {
    try {
      const content = files
        .map((file) => {
          return [file, this.api.fs.readFileSync(file).toString()].join('\n');
        })
        .join('\n\n');
      const prompt = `INSTRUCTIONS: ${instructions}\n\nFILES:\n\n${content}\n\nRemember to provide a JSON array of objects with the following format: [{ file: <file>, patch: <patch> }].`;
      const llmResponse = await this.api.callTool('callLLM', {
        system_prompt: 'Analyze the provided files, then analyse the instructions. Then, generate one or more patches for the files based on the given instructions. Return your patches as a JSON array of objects with the following format: [{ file: <file>, patch: <patch> }]. OUTPUT ONLY RAW JSON!',
        prompt,
      });
      if (resultVar) {
        this.api.store[resultVar] = llmResponse;
      }
      return llmResponse;
    } catch (error) {
      const llmResponse = await this.api.callTool('callLLM', {
        system_prompt: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
        prompt: JSON.stringify({
          error: error.message,
          stackTrace: error.stack,
          context: { files, instructions },
        }),
      });
      if (llmResponse.fix) {
        return llmResponse.fix;
      }
      throw error;
    }
  }
}

module.exports = GeneratePatches;