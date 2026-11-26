import { MessageLogEntity } from '../entities/message-log.entity.js';

export interface IMessageLogRepository {
  save(log: MessageLogEntity): Promise<void>;
  findRecent(limit?: number): Promise<MessageLogEntity[]>;
  countTotal(): Promise<number>;
}
