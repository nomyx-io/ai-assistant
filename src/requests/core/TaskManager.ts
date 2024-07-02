import { Task } from "../types";

export class TaskManager {
    tasks: Task[] = [];
  
    addTask(task: Task) {
      this.tasks.push(task);
    }
  
    updateTaskStatus(taskId: string, status: Task['status']) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task) task.status = status;
    }
  
    isComplete(): boolean {
      return this.tasks.every(task => task.status === 'completed' || task.status === 'failed');
    }
  
    getNextTask(): Task | null {
      return this.tasks.find(task => 
        task.status === 'pending' && 
        (!task.dependencies || task.dependencies.every(depId => 
          this.tasks.find(t => t.id === depId)?.status === 'completed'
        ))
      ) || null;
    }
  }