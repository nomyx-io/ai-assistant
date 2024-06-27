// This is javascript code for a tool module
class generate_patchesTool {

  async execute({ files, instructions, resultVar }, api) {
    try {
      const content = files
        .map((file) => {
          return [file, api.fs.readFileSync(file).toString()].join('\n');
        })
        .join('\n\n');
      const prompt = `INSTRUCTIONS: ${instructions}\n\nFILES:\n\n${content}\n\nRemember to provide a JSON array of objects with the following format: [{ file: <file>, patch: <patch> }].`;
      let llmResponse = await api.conversation.chat([
        {
          role: 'system',
          content: 'Analyze the provided files, then analyse the instructions. Then, generate one or more patches for the files based on the given instructions. Return your patches as a JSON array of objects with the following format: [{ file: <file>, patch: <patch> }]. OUTPUT ONLY RAW JSON!',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);
      llmResponse = llmResponse.content[0].text.trim();
      if (resultVar) {
        api.store[resultVar] = llmResponse;
      }
      return llmResponse;
    } catch (error) {
      let llmResponse = await api.conversation.chat([
        {
          role: 'system',
          content: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            error: error.message,
            stackTrace: error.stack,
            context: { files, instructions },
          }),
        },
      ]);
      llmResponse = llmResponse.content[0].text.trim();
      if (llmResponse.fix) {
        return llmResponse.fix;
      }
      throw new Error(llmResponse);
    }
  }

}

module.exports = new generate_patchesTool();