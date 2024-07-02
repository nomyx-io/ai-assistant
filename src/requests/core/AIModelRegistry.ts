import { AIModel } from "../types";

export class AIModelRegistry {
    private models: Map<string, AIModel> = new Map();
  
    registerModel(model: AIModel) {
      this.models.set(model.name, model);
    }
  
    getModel(name: string): AIModel | undefined {
      return this.models.get(name);
    }
  
    async generateWithModel(modelName: string, prompt: string, parameters?: any): Promise<string> {
      const model = this.getModel(modelName);
      if (!model) {
        throw new Error(`Model ${modelName} not found`);
      }
      return await model.generate(prompt, parameters);
    }
  }