// conversationService.ts
import Conversation from './conversation';
import { StateObject } from '../state';

export class ConversationService {
  public conversation: Conversation;

  constructor(model: string = 'claude') {
    this.conversation = new Conversation(model);
  }
  
  async chat(messages: any[], state: StateObject): Promise<any> {
    if(messages[0].role === 'system' && state) {
      messages[0].content += '\n\nThe current application state is: ' + JSON.stringify(state);
    }
    return this.conversation.chat(messages, {
      max_tokens: 4000,
      temperature: 0.618
    } as any);
  }

  setModel(model: string): void {
    this.conversation = new Conversation(model);
  }
}