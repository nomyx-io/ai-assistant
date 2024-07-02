import { TransformableState } from "./TransformableState";

export class Session {
    id: string;
    history: Array<{request: Request, response: Response}>;
    state: TransformableState;
    activeModels: string[];
  
    constructor(id: string) {
      this.id = id;
      this.history = [];
      this.state = new TransformableState();
      this.activeModels = [];
    }
  
    addInteraction(request: Request, response: Response) {
      this.history.push({request, response});
    }
  
    updateState(newState: Partial<TransformableState>) {
      this.state.updateState(newState);
    }
  }