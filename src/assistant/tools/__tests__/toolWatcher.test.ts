import { ToolWatcher } from '../toolWatcher';
import { ToolRegistry } from '../toolRegistry';
import { MetricsService } from '../../metrics/metricsService';
import { ConversationService } from '../../conversation/conversationService';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';

jest.mock('../toolRegistry');
jest.mock('../../metrics/metricsService');
jest.mock('../../conversation/conversationService');
jest.mock('path');
jest.mock('chokidar');

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
  },
  existsSync: jest.fn(),
}));

describe('ToolWatcher', () => {
  let toolWatcher: ToolWatcher;
  let mockToolRegistry: jest.Mocked<ToolRegistry>;
  let mockMetricsService: jest.Mocked<MetricsService>;
  let mockConversationService: jest.Mocked<ConversationService>;

  beforeEach(() => {
    mockMetricsService = new MetricsService() as jest.Mocked<MetricsService>;
    mockConversationService = new ConversationService() as jest.Mocked<ConversationService>;
    mockToolRegistry = new ToolRegistry(mockMetricsService, mockConversationService) as jest.Mocked<ToolRegistry>;
    
    // Mock path.join to return a fixed path
    (path.join as jest.Mock).mockReturnValue('/mock/tools/dir');
    
    // Mock fs.existsSync to return true
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // Mock chokidar.watch to return a mock watcher
    (chokidar.watch as jest.Mock).mockReturnValue({
      on: jest.fn().mockReturnThis(),
    });

    toolWatcher = new ToolWatcher(mockToolRegistry);
  });

  it('should initialize and load existing tools', async () => {
    const mockReaddir = jest.spyOn(fs.promises, 'readdir').mockResolvedValue(['tool1.ts', 'tool2.ts'] as any);
    const mockLoadTool = jest.spyOn(toolWatcher as any, 'loadTool').mockResolvedValue(undefined);

    await toolWatcher.initialize();

    expect(mockReaddir).toHaveBeenCalledWith('/mock/tools/dir');
    expect(mockLoadTool).toHaveBeenCalledTimes(2);
    expect(mockLoadTool).toHaveBeenCalledWith('/mock/tools/dir/tool1.ts');
    expect(mockLoadTool).toHaveBeenCalledWith('/mock/tools/dir/tool2.ts');
  });

  it('should handle new file', async () => {
    const mockLoadTool = jest.spyOn(toolWatcher as any, 'loadTool').mockResolvedValue(undefined);
    
    await (toolWatcher as any).handleNewFile('/path/to/newTool.ts');

    expect(mockLoadTool).toHaveBeenCalledWith('/path/to/newTool.ts');
  });

  it('should handle file change', async () => {
    const mockLoadTool = jest.spyOn(toolWatcher as any, 'loadTool').mockResolvedValue(undefined);
    
    await (toolWatcher as any).handleFileChange('/path/to/changedTool.ts');

    expect(mockLoadTool).toHaveBeenCalledWith('/path/to/changedTool.ts');
  });

  it('should handle file removal', async () => {
    await (toolWatcher as any).handleFileRemoval('/path/to/removedTool.ts');

    expect(mockToolRegistry.removeTool).toHaveBeenCalledWith('removedTool');
  });

  it('should load a tool', async () => {
    const mockToolModule = {
      default: {
        name: 'testTool',
        execute: jest.fn(),
        schema: {},
        tags: []
      }
    };
    jest.mock('/path/to/testTool.ts', () => mockToolModule, { virtual: true });

    await (toolWatcher as any).loadTool('/path/to/testTool.ts');

    expect(mockToolRegistry.addTool).toHaveBeenCalledWith(
      "testTool",
      expect.any(Function),
      mockToolModule.default.schema,
      mockToolModule.default.tags || []
    );
  });
});