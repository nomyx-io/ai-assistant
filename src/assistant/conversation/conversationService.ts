// conversationService.ts
import Conversation from './conversation';

export class ConversationService {
  public conversation: Conversation;

  constructor(model: string = 'claude') {
    this.conversation = new Conversation(model);
  }

  async chat(messages: any[], options: any = {}, model: string = 'gemini-1.5-pro-001'): Promise<any> {
    try {
      const response = await this.conversation.chat(messages, options, model);
      return response;
    } catch (error) {
      console.error('Error in conversation:', error);
      throw error;
    }
  }

  setModel(model: string): void {
    this.conversation = new Conversation(model);
  }
}