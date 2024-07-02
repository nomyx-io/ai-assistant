import { Handler } from '../core/Handler';
import { ExecutionContext } from '../types';

export class ImageProcessingHandler extends Handler {
  async handle(context: ExecutionContext): Promise<void> {
    if (context.request.type === 'image') {
      // Process image
      console.log('Processing image...');
      // Simulating image processing
      context.state.intermediateResults['imageProcessing'] = 'Processed image data';
    }
    if (this.next) {
      await this.next.handle(context);
    }
  }
}
