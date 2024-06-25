import { MemoryStore, Memory } from './store';
import { ChromaClient } from 'chromadb';
import { ConfidenceCalculator } from './confidence';
import natural from 'natural';

export class MemoryConsolidator {
  private chromaClient: ChromaClient;
  private confidenceCalculator: ConfidenceCalculator;
  private tfidf: natural.TfIdf;

  constructor(chromaClient: ChromaClient) {
    this.chromaClient = chromaClient;
    this.confidenceCalculator = new ConfidenceCalculator();
    this.tfidf = new natural.TfIdf();
  }

  async consolidateMemories(memoryStore: MemoryStore): Promise<void> {
    const memories = await memoryStore.listMemories();
    this.buildTfidfModel(memories);
    const clusters = await this.clusterSimilarMemories(memories);
    
    for (const cluster of clusters) {
      if (cluster.length > 1) {
        const consolidatedMemory = await this.mergeMemories(cluster);
        await this.updateConsolidatedMemory(memoryStore, consolidatedMemory, cluster);
      }
    }
  }

  private buildTfidfModel(memories: Memory[]): void {
    memories.forEach(memory => {
      this.tfidf.addDocument(memory.input + ' ' + memory.response);
    });
  }

  private async clusterSimilarMemories(memories: Memory[]): Promise<Memory[][]> {
    const SIMILARITY_THRESHOLD = 0.8;
    const clusters: Memory[][] = [];
    const embeddingCache: { [key: string]: number[] } = {};

    for (const memory of memories) {
      let added = false;
      const memoryEmbedding = await this.getEmbedding(memory.input + ' ' + memory.response, embeddingCache);

      for (const cluster of clusters) {
        const clusterEmbedding = await this.getEmbedding(
          cluster[0].input + ' ' + cluster[0].response,
          embeddingCache
        );
        
        if (this.cosineSimilarity(memoryEmbedding, clusterEmbedding) > SIMILARITY_THRESHOLD) {
          cluster.push(memory);
          added = true;
          break;
        }
      }

      if (!added) {
        clusters.push([memory]);
      }
    }

    return clusters;
  }

  private async getEmbedding(text: string, cache: { [key: string]: number[] }): Promise<number[]> {
    if (!cache[text]) {
     const coll = await this.chromaClient.getOrCreateCollection({
      name: "agent_memories",
      metadata: { "hnsw:space": "cosine" }
     });
     cache[text] = await coll.embeddingFunction.generate([text])[0]
    }
    return cache[text];
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (mag1 * mag2);
  }

  private async mergeMemories(cluster: Memory[]): Promise<Memory> {
    const combinedInput = this.combineTexts(cluster.map(m => m.input));
    const combinedResponse = this.combineTexts(cluster.map(m => m.response));
    
    const newConfidence = await this.calculateMergedConfidence(cluster, combinedInput, combinedResponse);

    return {
      input: combinedInput,
      response: combinedResponse,
      confidence: newConfidence,
    };
  }

  private combineTexts(texts: string[]): string {
    const sentences = texts.flatMap(text => text.split(/[.!?]+/).filter(s => s.trim().length > 0));
    const uniqueSentences = Array.from(new Set(sentences));
    
    uniqueSentences.sort((a, b) => {
      const scoreA = this.tfidf.tfidf(a.split(' '), 0);
      const scoreB = this.tfidf.tfidf(b.split(' '), 0);
      return scoreB - scoreA;
    });

    return uniqueSentences.join('. ') + '.';
  }

  private async calculateMergedConfidence(cluster: Memory[], combinedInput: string, combinedResponse: string): Promise<number> {
    const individualConfidences = cluster.map(m => m.confidence);
    const averageConfidence = individualConfidences.reduce((sum, conf) => sum + conf, 0) / cluster.length;
    
    const newInitialConfidence = await this.confidenceCalculator.calculateInitialConfidence(1.0, combinedResponse);
    
    return (averageConfidence + newInitialConfidence) / 2;
  }

  private async updateConsolidatedMemory(
    memoryStore: MemoryStore,
    consolidatedMemory: Memory,
    originalMemories: Memory[]
  ): Promise<void> {
    await memoryStore.storeMemory(
      consolidatedMemory.input,
      consolidatedMemory.response,
      consolidatedMemory.confidence
    );

    for (const memory of originalMemories) {
      await memoryStore.removeMemory(memory.input);
    }
  }
}