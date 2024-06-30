import { NotificationSystem, NotificationCallback, ResponseChunk } from './types';

export class InMemoryNotificationSystem implements NotificationSystem {
  private subscribers: Set<NotificationCallback> = new Set();

  subscribe(callback: NotificationCallback): void {
    this.subscribers.add(callback);
  }

  unsubscribe(callback: NotificationCallback): void {
    this.subscribers.delete(callback);
  }

  notify(chunk: ResponseChunk): void {
    this.subscribers.forEach(callback => callback(chunk));
  }
}