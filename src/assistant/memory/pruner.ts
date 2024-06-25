import { MemoryStore, Memory } from './store';

export class MemoryPruner {
  async pruneMemories(memoryStore: MemoryStore): Promise<void> {
    const memories = await memoryStore.listMemories();
    const memoriesToPrune = this.identifyMemoriesToPrune(memories);
    await this.removeMemories(memoryStore, memoriesToPrune);
  }

  private identifyMemoriesToPrune(memories: Memory[]): string[] {
    const LOW_CONFIDENCE_THRESHOLD = 0.3;
    const MAX_MEMORIES = 1000; // Arbitrary limit

    let memoriesToPrune: string[] = [];

    // Prune low confidence memories
    memoriesToPrune = memoriesToPrune.concat(
      memories
        .filter(memory => memory.confidence < LOW_CONFIDENCE_THRESHOLD)
        .map(memory => memory.input)
    );

    // If we're still over the limit, remove oldest memories
    if (memories.length - memoriesToPrune.length > MAX_MEMORIES) {
      const sortedMemories = memories.sort((a, b) => b.confidence - a.confidence);
      memoriesToPrune = memoriesToPrune.concat(
        sortedMemories
          .slice(MAX_MEMORIES)
          .map(memory => memory.input)
      );
    }

    return memoriesToPrune;
  }

  private async removeMemories(memoryStore: MemoryStore, memoryInputs: string[]): Promise<void> {
    for (const input of memoryInputs) {
      // Assuming MemoryStore has a removeMemory method
      await memoryStore.removeMemory(input);
    }
  }
}