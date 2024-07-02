export interface Request {
    id: string;
    type: string;
    input: any;
    context?: any;
    parameters?: Record<string, any>;
    metadata: {
        timestamp: Date;
        userId?: string;
    };
}

// core/types.ts
export interface Response {
    id: string;
    requestId: string;
    output: any;
    status: 'success' | 'error' | 'pending';
    metadata: {
        timestamp: Date;
        modelUsed: string[];
        executionTime: number;
    };
    intermediateSteps?: any[];
}

export interface Task {
    id: string;
    type: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    dependencies?: string[];
    data: any;
    metadata: {
        timestamp: Date;
        userId?: string;
    };
    description: string;
}

export interface Goal {
    id: string;
    description: string;
    checkCompletion: (state: TransformableState) => boolean;
}

export interface Plugin {
    name: string;
    initialize: (orchestrator: AIOrchestrator) => void;
    hooks: {
        [key: string]: (context: ExecutionContext) => Promise<void>;
    };
}


export interface Session {
    id: string;
    tasks: Task[];
    activeModels: AIModel[];
    state: TransformableState;
    metadata: {
        timestamp: Date;
        userId?: string;
    };
}


class TransformableState {
    currentStep: string;
    intermediateResults: Record<string, any>;
    pendingTasks: string[];
    resources: Record<string, any>;

    constructor() {
        this.currentStep = 'initial';
        this.intermediateResults = {};
        this.pendingTasks = [];
        this.resources = {};
    }

    updateState(newData: Partial<TransformableState>) {
        Object.assign(this, newData);
    }
}

export interface AIOrchestrator {
    sessions: Session[];
    goals: Goal[];
    plugins: Plugin[];
    state: TransformableState;
    middleware: MiddlewareFunction[];
    addSession: (session: Session) => void;
    addGoal: (goal: Goal) => void;
    addPlugin: (plugin: Plugin) => void;
    addMiddleware: (middleware: MiddlewareFunction) => void;
    execute: (request: Request) => Promise<Response>;
}

export interface Goal {
    id: string;
    description: string;
    checkCompletion: (state: TransformableState) => boolean;
}

export interface Plugin {
    name: string;
    initialize: (orchestrator: AIOrchestrator) => void;
    hooks: {
        [key: string]: (context: ExecutionContext) => Promise<void>;
    };
}

export type MiddlewareFunction = (context: ExecutionContext, next: () => Promise<void>) => Promise<void>;

export interface ExecutionContext {
    session: Session;
    request: Request;
    response: Response | null;
    state: TransformableState;
}

export interface AIModel {
    name: string;
    generate: (prompt: string, parameters?: any) => Promise<string>;
}