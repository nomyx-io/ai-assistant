import { MetadataManager, ScriptMetadata } from '../metadataManager';
import { ToolRegistry } from '../../tools/toolRegistry';

jest.mock('../../tools/toolRegistry');

describe('MetadataManager', () => {
  let mockToolRegistry: jest.Mocked<ToolRegistry>;
  let mockMetricsService: any;
  let mockConversationService: any;
  beforeEach(() => {
    mockMetricsService = {
      recordToolAddition: jest.fn(),
      recordToolUpdate: jest.fn(),
      recordToolRemoval: jest.fn(),
      getToolMetrics: jest.fn(),
      getAllMetrics: jest.fn()
    };
    mockConversationService = {
      chat: jest.fn()
    };
    mockToolRegistry = new ToolRegistry(mockMetricsService, mockConversationService) as any;
  });

  it('should add metadata to a script', async () => {
    const scriptName = 'testScript';
    const metadata: Partial<ScriptMetadata> = { description: 'Test script' };
    
    mockToolRegistry.getTool.mockResolvedValue({
      name: scriptName,
      source: 'console.log("test")',
      schema: {},
      tags: [],
      metadata: {}
    } as any);

    await MetadataManager.addMetadata(mockToolRegistry, scriptName, metadata);

    expect(mockToolRegistry.updateTool).toHaveBeenCalledWith(
      "testScript",
      "console.log(\"test\")",
      {},
      [],
      expect.objectContaining({ description: "Test script" })
    );
  });

  // Add more tests for getMetadata, updateMetadata, and removeMetadata
});