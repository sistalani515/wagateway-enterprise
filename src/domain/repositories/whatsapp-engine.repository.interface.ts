import { WhatsAppEngineEntity } from '../entities/whatsapp-engine.entity.js';

export interface IWhatsAppEngineRepository {
  findById(id: string): Promise<WhatsAppEngineEntity | null>;
  findAll(): Promise<WhatsAppEngineEntity[]>;
  save(engine: WhatsAppEngineEntity): Promise<void>;
  update(engine: WhatsAppEngineEntity): Promise<void>;
  delete(id: string): Promise<void>;
}
