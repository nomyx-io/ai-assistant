const axios = require('axios');

class AssistantClient {
  axiosInstance
  constructor(apiKey: string) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.openai.com/v1/assistants',
      headers: {
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1',
        'Authorization': `Bearer ${apiKey}`
      }
    });
  }

  async list() {
    try {
      const response = await this.axiosInstance.get('/');
      return response.data.data;
    } catch (error) {
      console.error('Error listing assistants:', error);
      throw error;
    }
  }

  assistant(assistantId: string) {
    return new Assistant(this.axiosInstance, assistantId);
  }

  async new(description: string, functions: any, isCodeInterpreter: boolean, isRetrievalBased: boolean) {
    try {
      const response = await this.axiosInstance.post('/', {
        description,
        functions,
        isCodeInterpreter,
        isRetrievalBased
      });
      return new Assistant(this.axiosInstance, response.data.id);
    } catch (error) {
      console.error('Error creating new assistant:', error);
      throw error;
    }
  }
}

class Assistant {
  constructor(public axiosInstance: any, public assistantId: any) {}

  thread(userId: any) {
    return new Thread(this.axiosInstance, this.assistantId, userId);
  }
}

class Thread {
  axiosInstance;
  assistantId;
  userId;
  threadId: string | undefined;
  constructor(axiosInstance: any, assistantId: any, userId: any) {
    this.axiosInstance = axiosInstance;
    this.assistantId = assistantId;
    this.userId = userId;
    this.threadId = undefined;
  }

  async createThread() {
    try {
      const response = await this.axiosInstance.post(`/${this.assistantId}/threads`, {
        user_id: this.userId
      });
      this.threadId = response.data.id;
    } catch (error) {
      console.error('Error creating thread:', error);
      throw error;
    }
  }

  async getMessages() {
    if (!this.threadId) {
      throw new Error('Thread ID is not set. Cannot retrieve messages.');
    }
    try {
      const response = await this.axiosInstance.get(`/${this.assistantId}/threads/${this.threadId}/messages`);
      return response.data.messages;
    } catch (error) {
      console.error('Error retrieving messages:', error);
      throw error;
    }
  }

  async waitResponse(query: string) {
    try {
      const responseReceipt = await this.requestResponse(query);
      return await this.getResponseStatus(responseReceipt);
    } catch (error) {
      console.error('Error while waiting for response:', error);
      throw error;
    }
  }

  async requestResponse(query: string) {
    if (!this.threadId) {
      throw new Error('Thread ID is not set. Cannot send query.');
    }

    try {
      const response = await this.axiosInstance.post(`/${this.assistantId}/threads/${this.threadId}/query`, {
        query: query
      });
      return response.data.responseReceipt;
    } catch (error) {
      console.error('Error sending query:', error);
      throw error;
    }
  }

  async getResponseStatus(responseReceipt: any) {
    const checkInterval = 1000; // Interval in milliseconds to poll for response status
    let isResponseReady = false;

    while (!isResponseReady) {
      try {
        const response = await this.axiosInstance.get(`/${this.assistantId}/responses/${responseReceipt}`);
        
        if (response.data && response.data.status === 'ready') {
          isResponseReady = true;
          return response.data;
        }

        // Wait for a set interval before checking again
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.error('Error polling for response status:', error);
        throw error;
      }
    }
  }
}

module.exports = AssistantClient;
