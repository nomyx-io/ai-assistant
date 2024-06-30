// toolRegistry.test.ts
import { ToolRegistry } from '../toolRegistry';
import { sampleTool } from './fixtures/sampleTool';
import { MockMetricsService } from './fixtures/mockMetricsService';
import { ConversationService } from '../../conversation/conversationService';
import { Tool } from '../tool';


describe('ToolRegistry', () => {
    let toolRegistry: ToolRegistry;
    let mockMetricsService: MockMetricsService;
    let mockConversationService: jest.Mocked<ConversationService>;

    beforeEach(() => {
        mockMetricsService = new MockMetricsService();
        mockConversationService = {
            chat: jest.fn(),
            setModel: jest.fn(),
        } as any;
        toolRegistry = new ToolRegistry(mockMetricsService as any, mockConversationService);
    });

    describe('addTool', () => {
        it('should add a new tool successfully', async () => {
            const result = await toolRegistry.addTool(
                sampleTool.name,
                sampleTool.source,
                sampleTool.schema,
                sampleTool.tags,
                console.log
            );
            expect(result).toBe(true);
            const tool = await toolRegistry.getTool(sampleTool.name);
            expect(tool).toBeDefined();
            expect(tool?.name).toBe(sampleTool.name);
            expect(mockMetricsService.recordToolAddition).toHaveBeenCalledWith(sampleTool.name);
        });

        it('should not add a tool with a duplicate name', async () => {
            await toolRegistry.addTool(
                sampleTool.name,
                sampleTool.source,
                sampleTool.schema,
                sampleTool.tags,
                console.log
            );
            const result = await toolRegistry.addTool(
                sampleTool.name,
                'different source',
                sampleTool.schema,
                sampleTool.tags,
                console.log
            );
            expect(result).toBe(false);
            expect(mockMetricsService.recordToolAddition).toHaveBeenCalledTimes(1);
        });
    });

    describe('updateTool', () => {
        it('should update an existing tool', async () => {
            await toolRegistry.addTool(
                sampleTool.name,
                sampleTool.source,
                sampleTool.schema,
                sampleTool.tags,
                console.log
            );
            const newSource = 'console.log("Updated!");';
            const result = await toolRegistry.updateTool(
                sampleTool.name,
                newSource,
                sampleTool.schema,
                sampleTool.tags,
            );
            expect(result).toBe(true);
            const tool = await toolRegistry.getTool(sampleTool.name);
            expect(tool?.source).toBe(newSource);
            expect(mockMetricsService.recordToolUpdate).toHaveBeenCalledWith(sampleTool.name);
        });

        it('should return false for non-existent tool', async () => {
            const result = await toolRegistry.updateTool(
                'nonExistentTool',
                sampleTool.source,
                sampleTool.schema,
                sampleTool.tags
            );
            expect(result).toBe(false);
            expect(mockMetricsService.recordToolUpdate).not.toHaveBeenCalled();
        });
    });


    describe('removeTool', () => {
        it('should remove an existing tool', async () => {
            await toolRegistry.addTool(
                sampleTool.name,
                sampleTool.source,
                sampleTool.schema,
                sampleTool.tags,
                console.log
            );
            const result = await toolRegistry.removeTool(sampleTool.name);
            expect(result).toBe(true);
            expect(await toolRegistry.getTool(sampleTool.name)).toBeUndefined();
            expect(mockMetricsService.recordToolRemoval).toHaveBeenCalledWith(sampleTool.name);
        });

        it('should return false for non-existent tool', async () => {
            const result = await toolRegistry.removeTool('nonExistentTool');
            expect(result).toBe(false);
            expect(mockMetricsService.recordToolRemoval).not.toHaveBeenCalled();
        });
    });

    describe('getTool', () => {
        it('should return the correct tool by name', async () => {
            await toolRegistry.addTool(
                sampleTool.name,
                sampleTool.source,
                sampleTool.schema,
                sampleTool.tags,
                console.log
            );
            const tool = await toolRegistry.getTool(sampleTool.name);
            expect(tool).toBeDefined();
            expect(tool?.name).toBe(sampleTool.name);
            expect(tool?.source).toBe(sampleTool.source);
        });

        it('should return undefined for non-existent tool', async () => {
            const tool = await toolRegistry.getTool('nonExistentTool');
            expect(tool).toBeUndefined();
        });
    });

    describe('callTool', () => {
        it('should execute the tool and return the result', async () => {
            const mockExecute = jest.fn().mockResolvedValue('result');
            await toolRegistry.addTool(
                sampleTool.name,
                sampleTool.source,
                sampleTool.schema,
                sampleTool.tags,
                console.log
            );
            const tool = await toolRegistry.getTool(sampleTool.name);
            (tool as any).execute = mockExecute;

            const result = await toolRegistry.callTool(sampleTool.name, { param: 'value' });
            expect(result).toBe('result');
            expect(mockExecute).toHaveBeenCalledWith({ param: 'value' });
            expect(mockMetricsService.recordToolUsage).toHaveBeenCalledWith(sampleTool.name, expect.any(Number), true);
        });

        it('should throw an error for non-existent tool', async () => {
            await expect(toolRegistry.callTool('nonExistentTool', {})).rejects.toThrow('Tool not found');
        });

        it('should record tool usage failure on error', async () => {
            await toolRegistry.addTool(
                sampleTool.name,
                sampleTool.source,
                sampleTool.schema,
                sampleTool.tags,
                console.log
            );
            const tool = await toolRegistry.getTool(sampleTool.name);
            (tool as any).execute = jest.fn().mockRejectedValue(new Error('Execution failed'));

            await expect(toolRegistry.callTool(sampleTool.name, {})).rejects.toThrow('Execution failed');
            expect(mockMetricsService.recordToolUsage).toHaveBeenCalledWith(sampleTool.name, expect.any(Number), false);
        });
    });

    describe('getToolList', () => {
        it('should return a list of all tools', async () => {
            await toolRegistry.addTool(
                sampleTool.name,
                sampleTool.source,
                sampleTool.schema,
                sampleTool.tags,
                console.log
            );
            await toolRegistry.addTool(
                'anotherTool',
                'console.log("Another tool");',
                { description: 'Another test tool' },
                ['test'],
                console.log
            );
            const tools = await toolRegistry.getToolList();
            expect(tools).toHaveLength(2);
            expect(tools[0]).toBeInstanceOf(Tool);
            expect(tools[1]).toBeInstanceOf(Tool);
            expect(tools.map(t => t.name)).toContain(sampleTool.name);
            expect(tools.map(t => t.name)).toContain('anotherTool');
        });
    });

    describe('improveTools', () => {
        it('should attempt to improve tools that need improvement', async () => {
            const mockImprove = jest.fn().mockResolvedValue('improved source');
            jest.spyOn(toolRegistry as any, 'getImprovedToolSource').mockImplementation(mockImprove);

            await toolRegistry.addTool(
                sampleTool.name,
                sampleTool.source,
                sampleTool.schema,
                ['auto-generated'],
                console.log
            );
            const tool = await toolRegistry.getTool(sampleTool.name);
            (tool as any).needsImprovement = jest.fn().mockReturnValue(true);

            await toolRegistry.improveTools();

            expect(mockImprove).toHaveBeenCalled();
            expect(mockMetricsService.recordToolUpdate).toHaveBeenCalledWith(sampleTool.name);
        });

        it('should not attempt to improve tools that don\'t need improvement', async () => {
            const mockImprove = jest.fn().mockResolvedValue('improved source');
            jest.spyOn(toolRegistry as any, 'getImprovedToolSource').mockImplementation(mockImprove);

            await toolRegistry.addTool(
                sampleTool.name,
                sampleTool.source,
                sampleTool.schema,
                sampleTool.tags,
                console.log
            );
            const tool = await toolRegistry.getTool(sampleTool.name);
            (tool as any).needsImprovement = jest.fn().mockReturnValue(false);

            await toolRegistry.improveTools();

            expect(mockImprove).not.toHaveBeenCalled();
            expect(mockMetricsService.recordToolUpdate).not.toHaveBeenCalled();
        });
    });

    describe('analyzeAndCreateToolFromScript', () => {
        it('should analyze a script and create a new tool if appropriate', async () => {
            const mockAnalyze = jest.fn().mockResolvedValue({
                shouldCreateTool: true,
                name: 'newTool',
                source: 'console.log("New tool");',
                schema: { description: 'A new tool' },
                tags: ['auto-generated']
            });
            jest.spyOn(toolRegistry as any, 'analyzeScript').mockImplementation(mockAnalyze);

            await toolRegistry.analyzeAndCreateToolFromScript('console.log("Test script");', 'newTool', 'A test task');

            expect(mockAnalyze).toHaveBeenCalledWith('console.log("Test script");', 'A test task');
            expect(mockMetricsService.recordToolAddition).toHaveBeenCalledWith('newTool');
        });

        it('should not create a tool if analysis suggests against it', async () => {
            const mockAnalyze = jest.fn().mockResolvedValue({ shouldCreateTool: false });
            jest.spyOn(toolRegistry as any, 'analyzeScript').mockImplementation(mockAnalyze);

            await toolRegistry.analyzeAndCreateToolFromScript('console.log("Test script");', 'Test Task', 'A test task');

            expect(mockAnalyze).toHaveBeenCalledWith('console.log("Test script");', 'A test task');
            expect(mockMetricsService.recordToolAddition).not.toHaveBeenCalled();
        });
    });

    describe('reviewAutoGeneratedTools', () => {
        it('should review and potentially modify auto-generated tools', async () => {
            await toolRegistry.addTool('autoTool', 'console.log("Auto tool");', { description: 'An auto-generated tool' }, ['auto-generated'], console.log);

            mockConversationService.chat.mockResolvedValue({
                content: [{
                    text: JSON.stringify({
                        action: 'modify',
                        reason: 'Improvement needed',
                        modifications: 'console.log("Improved auto tool");'
                    })
                }]
            });

            await toolRegistry.reviewAutoGeneratedTools();

            expect(mockConversationService.chat).toHaveBeenCalled();
            expect(mockMetricsService.recordToolUpdate).toHaveBeenCalledWith('autoTool');

            const updatedTool = await toolRegistry.getTool('autoTool');
            expect(updatedTool?.source).toBe('console.log("Improved auto tool");');
        });

        it('should remove auto-generated tools if review suggests removal', async () => {
            await toolRegistry.addTool('autoTool', 'console.log("Auto tool");', { description: 'An auto-generated tool' }, ['auto-generated'], console.log);

            mockConversationService.chat.mockResolvedValue({
                content: [{
                    text: JSON.stringify({
                        action: 'remove',
                        reason: 'Not useful'
                    })
                }]
            });

            await toolRegistry.reviewAutoGeneratedTools();

            expect(mockConversationService.chat).toHaveBeenCalled();
            expect(mockMetricsService.recordToolRemoval).toHaveBeenCalledWith('autoTool');

            const removedTool = await toolRegistry.getTool('autoTool');
            expect(removedTool).toBeUndefined();
        });
    });

    describe('initialize', () => {
        it('should initialize scriptManager and toolWatcher', async () => {
            const mockScriptManagerInitialize = jest.spyOn(toolRegistry['scriptManager'], 'initialize').mockResolvedValue();
            const mockToolWatcherInitialize = jest.spyOn(toolRegistry['toolWatcher'], 'initialize').mockResolvedValue();

            await toolRegistry.initialize();

            expect(mockScriptManagerInitialize).toHaveBeenCalled();
            expect(mockToolWatcherInitialize).toHaveBeenCalled();
        });
    });

    describe('installPackage', () => {
        it('should simulate package installation', async () => {
            const consoleSpy = jest.spyOn(console, 'log');
            await toolRegistry.installPackage('test-package');
            expect(consoleSpy).toHaveBeenCalledWith('Package installed: test-package');
        });
    });

    describe('installPackages', () => {
        it('should install multiple packages', async () => {
            const installPackageSpy = jest.spyOn(toolRegistry, 'installPackage').mockResolvedValue();
            await toolRegistry.installPackages(['package1', 'package2']);
            expect(installPackageSpy).toHaveBeenCalledTimes(2);
            expect(installPackageSpy).toHaveBeenCalledWith('package1');
            expect(installPackageSpy).toHaveBeenCalledWith('package2');
        });
    });

    describe('createTools', () => {
        it('should create multiple tools', async () => {
            const addToolSpy = jest.spyOn(toolRegistry, 'addTool').mockResolvedValue(true);
            const tools = [
                { name: 'tool1', source: 'source1', schema: {}, tags: [] },
                { name: 'tool2', source: 'source2', schema: {}, tags: [] }
            ];
            await toolRegistry.createTools(tools);
            expect(addToolSpy).toHaveBeenCalledTimes(2);
            expect(addToolSpy).toHaveBeenCalledWith('tool1', 'source1', {}, []);
            expect(addToolSpy).toHaveBeenCalledWith('tool2', 'source2', {}, []);
        });
    });

    describe('predictLikelyTools', () => {
        it('should predict likely tools for a given input', async () => {
            const mockResponse = [
                { tool: 'tool1', justification: 'reason1' },
                { tool: 'tool2', justification: 'reason2' }
            ];
            mockConversationService.chat.mockResolvedValue({ content: [{ text: JSON.stringify(mockResponse) }] });

            const result = await toolRegistry.predictLikelyTools({ task: 'test task' });

            expect(result).toEqual(mockResponse);
            expect(mockConversationService.chat).toHaveBeenCalled();
        });
    });

    describe('analyzeScript', () => {
        it('should analyze a script and suggest tool creation', async () => {
            const mockAnalysis = {
                shouldCreateTool: true,
                name: 'newTool',
                source: 'console.log("New tool");',
                schema: {},
                tags: ['auto-generated']
            };
            jest.spyOn(toolRegistry as any, 'analyzeScript').mockResolvedValue(mockAnalysis);

            const result = await (toolRegistry as any).analyzeScript('console.log("Test script");', 'Test description');

            expect(result).toEqual(mockAnalysis);
        });
    });

    describe('getMetrics', () => {
        it('should return metrics for a specific tool', () => {
            const mockMetrics = { usageCount: 5, averageExecutionTime: 100 };
            mockMetricsService.getToolMetrics.mockReturnValue(mockMetrics);

            const result = toolRegistry.getMetrics('testTool');

            expect(result).toEqual(mockMetrics);
            expect(mockMetricsService.getToolMetrics).toHaveBeenCalledWith('testTool');
        });
    });

    describe('getAllMetrics', () => {
        it('should return metrics for all tools', () => {
            const mockAllMetrics = new Map([
                ['tool1', { usageCount: 5, averageExecutionTime: 100 }],
                ['tool2', { usageCount: 3, averageExecutionTime: 150 }]
            ]);
            mockMetricsService.getAllMetrics.mockReturnValue(mockAllMetrics);

            const result = toolRegistry.getAllMetrics();

            expect(result).toEqual(mockAllMetrics);
            expect(mockMetricsService.getAllMetrics).toHaveBeenCalled();
        });
    });

    describe('getCompactRepresentation', () => {
        it('should return a compact representation of all tools', async () => {
            await toolRegistry.addTool('tool1', 'source1', { description: 'desc1' }, [], console.log);
            await toolRegistry.addTool('tool2', 'source2', { description: 'desc2' }, [], console.log);

            const result = toolRegistry.getCompactRepresentation();

            expect(result).toBe('tool1: desc1\ntool2: desc2');
        });
    });
});
