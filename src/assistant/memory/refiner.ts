import { MemoryStore, Memory } from './store';
import { ConfidenceCalculator } from './confidence';
import Conversation from '../conversation';

export class MemoryRefiner {
  private confidenceCalculator: ConfidenceCalculator;

  constructor() {
    this.confidenceCalculator = new ConfidenceCalculator();
  }

  async refineMemories(memoryStore: MemoryStore, model: string = 'claude'): Promise<void> {
    const memories = await memoryStore.listMemories();
    for (const memory of memories) {
      if (memory.confidence < 0.8) {
        const refinedResponse = await this.getRefinedResponse(memory.input, memory.response, model);
        const newConfidence = this.confidenceCalculator.updateConfidence(
          memory.confidence,
          memory.confidence // TODO: replace with Chroma's similarity score
        );
      await memoryStore.updateMemory(memory.input, refinedResponse, newConfidence);
    }
  }
}

// TODO: not gonna work, becuse it has no context of the conversation
private async getRefinedResponse(input: string, previousResponse: string, model: string): Promise<string> {
  const convo = new Conversation(model);
  const prompt = `Given the following input and previous response, please provide an improved response:
  
Input: ${input}

Previous Response: ${previousResponse}

Improved Response:`;

  const response = await convo.chat([
    { role: 'system', content: 'You are an AI assistant tasked with improving responses.' },
    { role: 'user', content: prompt }
  ]);

  return response.content[0].text;
}
}