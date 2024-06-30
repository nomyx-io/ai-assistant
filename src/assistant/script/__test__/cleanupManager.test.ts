import { ScriptCleanupManager } from '../cleanupManager';
import { ToolRegistry } from '../../tools/toolRegistry';
import { ScriptPerformanceMonitor } from '../performanceMonitor';
import { MetricsService } from '../../metrics/metricsService';
import { ConversationService } from '../../conversation/conversationService';

jest.mock('../../tools/toolRegistry');
jest.mock('../performanceMonitor');
jest.mock('../../metrics/metricsService');
jest.mock('../../conversation/conversationService');

describe('ScriptCleanupManager', () => {
  let mockToolRegistry: jest.Mocked<ToolRegistry>;
  let mockMetricsService: jest.Mocked<MetricsService>;
  let mockConversationService: jest.Mocked<ConversationService>;


  beforeEach(() => {
    mockMetricsService = new MetricsService() as jest.Mocked<MetricsService>;
    mockConversationService = new ConversationService() as jest.Mocked<ConversationService>;
    mockToolRegistry = new ToolRegistry(mockMetricsService, mockConversationService) as jest.Mocked<ToolRegistry>;
    jest.spyOn(ScriptPerformanceMonitor, 'getMetrics').mockImplementation((scriptName) => ({
      executionCount: scriptName === 'oldScript' ? 3 : 10,
      lastExecutionTime: new Date(Date.now() - (scriptName === 'oldScript' ? 40 : 20) * 24 * 60 * 60 * 1000),
      totalExecutionTime: 1000,
      averageExecutionTime: 100
    }));
  });

  it('should archive old and rarely used scripts', async () => {
    mockToolRegistry.getToolList.mockResolvedValue([
      { name: 'oldScript', source: 'console.log("old")', schema: {}, tags: [] },
      { name: 'newScript', source: 'console.log("new")', schema: {}, tags: [] }
    ] as any);

    await ScriptCleanupManager.cleanupUnusedScripts(mockToolRegistry);

    expect(mockToolRegistry.updateTool).toHaveBeenCalledWith(
      'oldScript',
      'console.log("old")',
      { archived: true },
      []
    );
    expect(mockToolRegistry.updateTool).not.toHaveBeenCalledWith(
      'newScript',
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });


  it('should not archive recently used scripts', async () => {
    mockToolRegistry.getToolList.mockResolvedValue([
      { name: 'recentScript', source: 'console.log("recent")', schema: {}, tags: [] } as any
    ]);

    jest.spyOn(ScriptPerformanceMonitor, 'getMetrics').mockImplementation(() => ({
      executionCount: 10,
      lastExecutionTime: new Date(),
      totalExecutionTime: 1000,
      averageExecutionTime: 100
    }));

    await ScriptCleanupManager.cleanupUnusedScripts(mockToolRegistry);

    expect(mockToolRegistry.updateTool).not.toHaveBeenCalled();
  });
});