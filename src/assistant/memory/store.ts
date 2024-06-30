// MemoryStore.ts
import { ChromaClient, Collection } from 'chromadb';

export interface Memory {
  input: string;
  response: string;
  confidence: number;
}

export class MemoryStore {
  private collection: Collection;

  constructor(private chromaClient: ChromaClient) {
    this.initializeCollection();
  }

  private async initializeCollection() {
    this.collection = await this.chromaClient.getOrCreateCollection({
      name: "agent_memories",
      metadata: { "hnsw:space": "cosine" }
    });
  }

  async storeMemory(input: string, response: string, confidence: number): Promise<void> {
    const id = this.generateId();
    await this.collection.add({
      ids: [id],
      documents: [response],
      metadatas: [{ input, confidence }],
    });
  }

  async findSimilarMemories(input: string, threshold: number): Promise<Array<Memory & { similarity: number }>> {
    await this.initializeCollection();
    const results = await this.collection.query({
      queryTexts: [input],
      nResults: 5,
    });

    return results.metadatas[0].map((metadata, index) => (metadata && results.distances ? {
      input: metadata.input,
      response: results.documents[0][index],
      confidence: metadata.confidence,
      similarity: 1 - (results.distances[0][index] || 0)
    } : null)).filter(memory => memory && memory.similarity > threshold) as any;
  }

  async updateMemory(input: string, response: string, newConfidence: number): Promise<void> {
    const results = await this.collection.query({
      queryTexts: [input],
      nResults: 1,
    });

    if (results.ids[0] && results.ids[0][0]) {
      const id = results.ids[0][0];
      await this.collection.update({
        ids: [id],
        documents: [response],
        metadatas: [{ input, confidence: newConfidence }],
      });
    }
  }

  async listMemories(): Promise<Memory[]> {
    const results = await this.collection.get();
    return results.metadatas.map((metadata, index) => (metadata && metadata.confidence ? {
      input: metadata.input,
      response: results.documents[index],
      confidence: metadata.confidence,
    } : null) as any).filter(memory => memory) as Memory[];
  }

  async removeMemory(input: string): Promise<void> {
    const results = await this.collection.query({
      queryTexts: [input],
      nResults: 1,
    });

    if (results.ids[0] && results.ids[0][0]) {
      const id = results.ids[0][0];
      await this.collection.delete({ ids: [id] });
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}