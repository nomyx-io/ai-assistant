import { Middleware } from '../middleware';
import { ConfigManager } from '../config';

export const loggingMiddleware: Middleware = async (request, next) => {
  const config = ConfigManager.getInstance().getConfig();
  if (config.logLevel === 'debug') {
    console.log(`Request started: ${request.id} for model ${request.modelId}`);
  }
  
  const start = Date.now();
  const responseGenerator = await next();
  
  return (async function* () {
    for await (const chunk of responseGenerator) {
      yield chunk;
      if (chunk.isComplete && config.logLevel === 'debug') {
        const duration = Date.now() - start;
        console.log(`Request completed: ${request.id}, duration: ${duration}ms`);
      }
    }
  })();
};