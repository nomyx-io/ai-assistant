// stateObject.ts

import { Task } from "./tasks/taskManager";

// This file contains the type definition for the state object that is passed around the system.
// This object contains the current state of the system, including the original goal, tasks, work products, and notes.


export interface StateObject {
    originalGoal: string;
    progress: string[];
    tasks: Task[];
    currentTask?: Task;
    isComplete?: boolean;
    currentTaskIndex: number;
    completedTasks: Task[];
    workProducts: any[];
    notes: string[];
    state: { 
        [key: string]: any;
    }
  }