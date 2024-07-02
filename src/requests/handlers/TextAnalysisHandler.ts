import { Handler } from '../core/Handler';
import { ExecutionContext } from '../types';

export class TextAnalysisHandler extends Handler {
  async handle(context: ExecutionContext): Promise<void> {
    if (context.request.type === 'text') {
      // Analyze text
      console.log('Analyzing text...');
      // Simulating text analysis
      context.state.intermediateResults['textAnalysis'] = 'Analyzed text data';
    }
    if (this.next) {
      await this.next.handle(context);
    }
  }
}