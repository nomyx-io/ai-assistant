import { Configuration, OpenAIApi } from 'openai';
import { BaseModel } from '../model';
import { ModelParams, ModelSource, RateLimiter } from '../types';
import { TokenBucketRateLimiter } from './rateLimiter';

export class OpenAIModel extends BaseModel {
  private openai: OpenAIApi;

  constructor(
    id: string,
    name: string,
    version: string,
    apiKey: string,
    categories: string[] = [],
    tags: string[] = [],
    source: string = 'openai',
    rateLimiter?: RateLimiter
  ) {
    super(id, name, version, source, categories, tags, new TokenBucketRateLimiter(60, 1, 1000)); // 60 requests per minute
    const configuration = new Configuration({ apiKey: this.apiKey });
    this.openai = new OpenAIApi(configuration);
  }

  async *generateResponse(params: ModelParams): AsyncGenerator<string> {
    const stream = await this.openai.createCompletion({
      model: this.name,
      prompt: params.prompt,
      max_tokens: params.maxTokens || 100,
      temperature: params.temperature || 0.7,
      stream: true,
    }, { responseType: 'stream' });

    for await (const chunk of stream.data as any) {
      const content = chunk.choices[0].text;
      if (content) {
        yield content;
      }
    }
  }
}