
export interface Task {
  name: string;
  params: any;
  description?: string;
  errorHandling?: string;
}

// taskManager.ts
import { EventEmitter } from 'events';
import { loggingService } from '../logging/logger';

export class TaskManager extends EventEmitter {
  private currentTask: Promise<any> | null = null;
  public isCancelling: boolean = false;

  async runTask(task: () => Promise<any>): Promise<any> {
    if (this.currentTask) {
      throw new Error('A task is already running');
    }

    this.isCancelling = false;
    this.currentTask = task();

    try {
      const result = await this.currentTask;
      this.currentTask = null;
      return result;
    } catch (error) {
      if (this.isCancelling) {
        loggingService.info('Task was cancelled');
        this.emit('taskCancelled');
      } else {
        throw error;
      }
    } finally {
      this.currentTask = null;
      this.isCancelling = false;
    }
  }

  async getActiveTasks(): Promise<Task[]> {
    if (this.currentTask) {
      return [{
        name: 'Running task',
        params: null
      }];
    } else {
      return [];
    }
  }
  
  async getActiveTask(): Promise<Task | null> {
    if (this.currentTask) {
      return {
        name: 'Running task',
        params: null
      };
    } else {
      return null;
    }
  }

  cancelCurrentTask(): void {
    if (this.currentTask) {
      this.isCancelling = true;
      loggingService.info('Cancelling current task...');
      this.emit('cancellingTask');
    }
  }

  isTaskRunning(): boolean {
    return this.currentTask !== null;
  }
}