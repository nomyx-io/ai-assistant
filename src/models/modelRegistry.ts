import { Model, ModelRegistry, SearchCriteria } from './types';
import { ModelNotFoundError } from './errors';

export class InMemoryModelRegistry implements ModelRegistry {
  private models: Map<string, Model> = new Map();
  private fallbackModels: Map<string, string> = new Map();

  registerModel(model: Model): void {
    this.models.set(model.id, model);
  }

  unregisterModel(modelId: string): void {
    this.models.delete(modelId);
    this.fallbackModels.delete(modelId);
  }

  getModelById(modelId: string): Model | undefined {
    return this.models.get(modelId);
  }

  getFallbackModel(modelId: string): Model | undefined {
    const fallbackId = this.fallbackModels.get(modelId);
    return fallbackId ? this.models.get(fallbackId) : undefined;
  }

  setFallbackModel(primaryModelId: string, fallbackModelId: string): void {
    if (!this.models.has(primaryModelId) || !this.models.has(fallbackModelId)) {
      throw new ModelNotFoundError('Primary or fallback model not found');
    }
    this.fallbackModels.set(primaryModelId, fallbackModelId);
  }

  listModels(): Model[] {
    return Array.from(this.models.values());
  }

  searchModels(criteria: SearchCriteria): Model[] {
    return this.listModels().filter(model => {
      return (
        (!criteria.categories || criteria.categories.some(cat => model.categories.includes(cat))) &&
        (!criteria.tags || criteria.tags.some(tag => model.tags.includes(tag))) &&
        (!criteria.name || model.name.toLowerCase().includes(criteria.name.toLowerCase())) &&
        (!criteria.version || model.version === criteria.version)
      );
    });
  }
}