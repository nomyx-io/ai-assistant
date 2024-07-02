// memoryService.ts
import { ChromaClient, Collection } from 'chromadb';
import { ConfidenceCalculator } from './confidence';
import { MemoryPruner } from './pruner';
import { MemoryConsolidator } from './consolidator';
import { MemoryRefiner } from './refiner';
import { MemoryStore } from './store';
import { cat } from 'shelljs';

export interface Memory {
  input: string;
  response: string;
  confidence: number;
}

export class MemoryService {
  private collection: Collection;
  private confidenceCalculator: ConfidenceCalculator;
  private memoryPruner: MemoryPruner;
  private memoryConsolidator: MemoryConsolidator;
  private memoryRefiner: MemoryRefiner;
  private memoryStore: MemoryStore;

  constructor(private chromaClient: ChromaClient) {
    this.initializeCollection();
    this.confidenceCalculator = new ConfidenceCalculator();
    this.memoryPruner = new MemoryPruner();
    this.memoryConsolidator = new MemoryConsolidator(chromaClient);
    this.memoryRefiner = new MemoryRefiner();
    this.memoryStore = new MemoryStore(chromaClient);
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
    await this.memoryStore.storeMemory( input, response, confidence );
  }

  async findSimilarMemories(input: string, threshold: number = 0.7): Promise<any> {
    try{
      await this.initializeCollection();
      const results = await this.collection.query({
        queryTexts: [input],
        nResults: 5,
      });
  
      return results.metadatas[0].map((metadata, index) => ({
        input: (metadata && metadata.input) || '',
        response: (results && results.documents && results.documents[0][index] ) || '',
        confidence: (metadata && metadata.input),
        similarity: results.distances && results.distances.length > 0 ? 1 - results.distances[0][index] : 0,
      })).filter(memory => memory.similarity > threshold) as any;
    } catch (e) {
      return [];
    }
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

  async listMemories(): Promise<any[]> {
    const results = await this.collection.get();
    return results.metadatas.map((metadata, index) => (metadata ? {
      input: metadata.input,
      response: results.documents[index],
      confidence: metadata.confidence,
    } : null));
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

  async pruneMemories(): Promise<void> {
    await this.memoryPruner.pruneMemories(this.memoryStore);
  }

  async consolidateMemories(): Promise<void> {
    await this.memoryConsolidator.consolidateMemories(this.memoryStore);
  }

  async refineMemories(model: string = 'claude'): Promise<void> {
    await this.memoryRefiner.refineMemories(this.memoryStore, model);
  }

  calculateInitialConfidence(chromaConfidence: number, response: string): number {
    return this.confidenceCalculator.calculateInitialConfidence(chromaConfidence, response);
  }

  calculateRetrievalConfidence(storedConfidence: number, chromaConfidence: number): number {
    return this.confidenceCalculator.calculateRetrievalConfidence(storedConfidence, chromaConfidence);
  }

  updateConfidence(oldConfidence: number, chromaConfidence: number): number {
    return this.confidenceCalculator.updateConfidence(oldConfidence, chromaConfidence);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}