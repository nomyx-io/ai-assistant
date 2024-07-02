export class TransformableState {
    currentStep: string;
    intermediateResults: Record<string, any>;
    pendingTasks: string[];
    resources: Record<string, any>;
    private stateHistory: TransformableState[] = [];
  
    constructor() {
      this.currentStep = 'initial';
      this.intermediateResults = {};
      this.pendingTasks = [];
      this.resources = {};
    }
  
    updateState(newData: Partial<TransformableState>) {
      Object.assign(this, newData);
    }
  
    saveCheckpoint() {
      this.stateHistory.push(JSON.parse(JSON.stringify(this)));
    }
  
    rollback(steps: number = 1) {
      const previousState = this.stateHistory[this.stateHistory.length - steps];
      if (previousState) {
        Object.assign(this, previousState);
        this.stateHistory = this.stateHistory.slice(0, -steps);
      }
    }
  }