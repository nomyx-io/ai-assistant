export class MockMetricsService {
    recordToolAddition = jest.fn();
    recordToolUpdate = jest.fn();
    recordToolRemoval = jest.fn();
    recordToolUsage = jest.fn();
    getToolMetrics = jest.fn();
    getAllMetrics = jest.fn();
  }