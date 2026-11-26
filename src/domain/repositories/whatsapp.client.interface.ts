import { MessageEntity } from '../entities/message.entity.js';
import { SessionEntity } from '../entities/session.entity.js';

export interface IWhatsAppClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(to: string, text: string): Promise<void>;
  onMessage(handler: (message: MessageEntity) => Promise<void>): void;
  onStatusChange(handler: (session: SessionEntity) => void): void;
  getSession(): SessionEntity;
}
