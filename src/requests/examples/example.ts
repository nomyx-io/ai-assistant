// main.ts
import { AIOrchestrator } from '../AIOrchestrator';
import { ImageProcessingHandler } from '../handlers/ImageProcessingHandler';
import { TextAnalysisHandler } from '../handlers/TextAnalysisHandler';
import { ResponseGenerationHandler } from '../handlers/ResponseGenerationHandler';
import { Request } from '../types';

async function main() {
  const orchestrator = new AIOrchestrator();

  // Set up the task chain
  const imageHandler = new ImageProcessingHandler();
  const textHandler = new TextAnalysisHandler();
  const responseHandler = new ResponseGenerationHandler();
  orchestrator.taskChain = imageHandler;
  imageHandler.setNext(textHandler).setNext(responseHandler);

  // Register a plugin
  orchestrator.registerPlugin({
    name: 'LoggingPlugin',
    initialize: (orch) => {
      orch.on('requestStart', (context) => {
        console.log('Request started:', context.request.id);
      });
      orch.on('requestEnd', (context) => {
        console.log('Request ended:', context.request.id);
      });
    },
    hooks: {
      preProcess: async (context) => {
        console.log('Pre-processing request:', context.request.id);
      },
      postProcess: async (context) => {
        console.log('Post-processing request:', context.request.id);
      }
    }
  });

  // Add middleware
  orchestrator.use(async (context, next) => {
    console.log('Middleware: Request received');
    await next();
    console.log('Middleware: Response sent');
  });

  // Process a request
  const request: Request = {
    id: `request-${Date.now()}`,
    type: 'image',
    input: 'base64encodedimage',
    metadata: {
      timestamp: new Date(),
      userId: 'user123'
    }
  };

  try {
    const response = await orchestrator.processRequest(request);
    console.log('Response:', response);
  } catch (error) {
    console.error('Error processing request:', error);
  }

  // Improve the system
  await orchestrator.improveSystem();
}

main().catch(console.error);