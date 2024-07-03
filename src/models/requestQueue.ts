import { Request, RequestQueue, RequestStatus } from './types';

export class InMemoryRequestQueue implements RequestQueue {
  complete(requestId: string): void {
    throw new Error('Method not implemented.');
  }
  private queue: Request[] = [];
  private statusMap: Map<string, RequestStatus> = new Map();

  enqueue(request: Request): string {
    this.queue.push(request);
    this.statusMap.set(request.id, 'pending');
    return request.id;
  }

  batchEnqueue(requests: Request[]): string[] {
    return requests.map(request => this.enqueue(request));
  }

  dequeue(): Request | undefined {
    const request = this.queue.shift();
    if (request) {
      this.statusMap.set(request.id, 'processing');
    }
    return request;
  }

  getStatus(requestId: string): RequestStatus {
    return this.statusMap.get(requestId) || 'failed';
  }

  setStatus(requestId: string, status: RequestStatus): void {
    this.statusMap.set(requestId, status);
  }
}