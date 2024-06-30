import { PromptService } from '../promptService';
import { ConversationService } from '../../conversation/conversationService';
import { ToolRegistry } from '../../tools/toolRegistry';
import { MetricsService } from '../../metrics/metricsService';

jest.mock('../../conversation/conversationService');
jest.mock('../../tools/toolRegistry');
jest.mock('../../metrics/metricsService');

describe('PromptService', () => {
  let promptService: PromptService;
  let mockConversationService: jest.Mocked<ConversationService>;
  let mockToolRegistry: jest.Mocked<ToolRegistry>;
  let mockMetricsService: jest.Mocked<MetricsService>;

  beforeEach(() => {
    mockConversationService = {
      chat: jest.fn(),
    } as unknown as jest.Mocked<ConversationService>;
    mockMetricsService = new MetricsService() as jest.Mocked<MetricsService>;
    mockToolRegistry = {
      getCompactRepresentation: jest.fn().mockReturnValue('mock representation'),
    } as unknown as jest.Mocked<ToolRegistry>;
    promptService = new PromptService(mockConversationService, mockToolRegistry);
  });
  

  it('should determine task tools', async () => {
    const mockResponse = {
      content: [{ text: JSON.stringify({
        existingTools: ['tool1'],
        newTools: ['newTool'],
        packages: ['package1'],
        useSingleTool: false,
        toolName: '',
        params: {}
      }) }]
    };
    mockConversationService.chat.mockResolvedValueOnce(mockResponse);
  
    const result = await promptService.determineTaskTools({
      task: 'test task',
      likelyTools: 'tool1, tool2',
      relevantMemories: 'memory1, memory2'
    });
  
    expect(mockConversationService.chat).toHaveBeenCalled();
    expect(result).toEqual({
      existingTools: ['tool1'],
      newTools: ['newTool'],
      packages: ['package1'],
      useSingleTool: false,
      toolName: '',
      params: {}
    });
  });

  it('should generate a tool', async () => {
    const mockResponse = {
      tool: 'newTool',
      description: 'A new tool',
      methodSignature: 'newTool(param: string): string',
      script: 'console.log("New tool");',
      packages: ['package1']
    };
    mockConversationService.chat.mockResolvedValue({ content: [{ text: JSON.stringify(mockResponse) }] });

    const result = await promptService.generateTool({
      toolName: 'newTool',
      description: 'A new tool',
      task: 'Create a new tool'
    });

    expect(result).toEqual(mockResponse);
  });

  it('should generate tasks', async () => {
    const mockResponse = [
      { task: 'task1', script: 'console.log("Task 1");', chat: 'Explanation 1' },
      { task: 'task2', script: 'console.log("Task 2");', chat: 'Explanation 2' }
    ];
    mockConversationService.chat.mockResolvedValue({ content: [{ text: JSON.stringify(mockResponse) }] });

    const result = await promptService.generateTasks({
      task: 'Main task',
      availableTools: ['tool1', 'tool2'],
      memories: 'memory1, memory2'
    });

    expect(result).toEqual(mockResponse);
  });

  it('should repair failed script execution', async () => {
    const mockResponse = {
      repaired: true,
      reason: 'Fixed syntax error',
      name: 'repairedScript',
      source: 'console.log("Repaired");'
    };
    mockConversationService.chat.mockResolvedValue({ content: [{ text: JSON.stringify(mockResponse) }] });

    const result = await promptService.repairFailedScriptExecution({
      error: new Error('Syntax error'),
      source: 'console.log("Broken")',
      availableTools: ['tool1', 'tool2'],
      memories: 'memory1, memory2'
    });

    expect(result).toEqual(mockResponse);
  });
  // Add more tests for generateTool, generateTasks, and repairFailedScriptExecution
});