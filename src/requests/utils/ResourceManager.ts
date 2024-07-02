import { Task } from "../types";

export class ResourceManager {
    availableResources: Record<string, number> = { 'cpu': 100, 'memory': 1000, 'gpu': 2 };
  
    allocateResources(task: Task): Record<string, number> {
      // Implement logic to determine resource needs based on task type and complexity
      // This is a simplified version
      const allocated = { 'cpu': 10, 'memory': 100, 'gpu': 0 };
      Object.keys(allocated).forEach(key => {
        this.availableResources[key] -= allocated[key];
      });
      return allocated;
    }
  
    releaseResources(resources: Record<string, number>) {
      Object.keys(resources).forEach(key => {
        this.availableResources[key] += resources[key];
      });
    }
  }