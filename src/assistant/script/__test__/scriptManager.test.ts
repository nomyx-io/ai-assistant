import { ScriptManager } from '../scriptManager';
import { ToolRegistry } from '../../tools/toolRegistry';
import { ScriptValidator } from '../validator';
import { ScriptPerformanceMonitor } from '../performanceMonitor';
import { ScriptCleanupManager } from '../cleanupManager';
import { MetadataManager } from '../metadataManager';

jest.mock('../validator');
jest.mock('../performanceMonitor');
jest.mock('../cleanupManager');
jest.mock('../metadataManager');

describe('ScriptManager', () => {
  let scriptManager: ScriptManager;
  let mockToolRegistry: jest.Mocked<ToolRegistry>;

  beforeEach(() => {
    mockToolRegistry = {
      addTool: jest.fn(),
      updateTool: jest.fn(),
      removeTool: jest.fn(),
      getTool: jest.fn(),
    } as any;
    scriptManager = new ScriptManager(mockToolRegistry);
  });

  it('should initialize and clean up unused scripts', async () => {
    await scriptManager.initialize();
    expect(ScriptCleanupManager.cleanupUnusedScripts).toHaveBeenCalledWith(mockToolRegistry);
  });

  it('should validate a script', async () => {
    const script = 'console.log("Hello, World!");';
    await scriptManager.validateScript(script);
    expect(ScriptValidator.validate).toHaveBeenCalledWith(script);
  });

  it('should record script execution', () => {
    const scriptName = 'testScript';
    const executionTime = 100;
    scriptManager.recordExecution(scriptName, executionTime);
    expect(ScriptPerformanceMonitor.recordExecution).toHaveBeenCalledWith(scriptName, executionTime);
  });

  it('should clean up unused scripts', async () => {
    await scriptManager.cleanupUnusedScripts();
    expect(ScriptCleanupManager.cleanupUnusedScripts).toHaveBeenCalledWith(mockToolRegistry);
  });

  it('should add metadata to a script', async () => {
    const scriptName = 'testScript';
    const metadata = { description: 'Test script' };
    await scriptManager.addMetadata(scriptName, metadata);
    expect(MetadataManager.addMetadata).toHaveBeenCalledWith(mockToolRegistry, scriptName, metadata);
  });

  it('should get metadata for a script', async () => {
    const scriptName = 'testScript';
    await scriptManager.getMetadata(scriptName);
    expect(MetadataManager.getMetadata).toHaveBeenCalledWith(mockToolRegistry, scriptName);
  });

  it('should update metadata for a script', async () => {
    const scriptName = 'testScript';
    const metadata = { description: 'Updated test script' };
    await scriptManager.updateMetadata(scriptName, metadata);
    expect(MetadataManager.updateMetadata).toHaveBeenCalledWith(mockToolRegistry, scriptName, metadata);
  });

  it('should remove metadata from a script', async () => {
    const scriptName = 'testScript';
    await scriptManager.removeMetadata(scriptName);
    expect(MetadataManager.removeMetadata).toHaveBeenCalledWith(mockToolRegistry, scriptName);
  });

  it('should get metrics for a script', () => {
    const scriptName = 'testScript';
    scriptManager.getMetrics(scriptName);
    expect(ScriptPerformanceMonitor.getMetrics).toHaveBeenCalledWith(scriptName);
  });

  it('should get all metrics', () => {
    scriptManager.getAllMetrics();
    expect(ScriptPerformanceMonitor.getAllMetrics).toHaveBeenCalled();
  });
});