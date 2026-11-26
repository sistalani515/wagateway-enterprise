import { ClientEntity } from '../entities/client.entity.js';

export interface IClientRepository {
  findById(id: string): Promise<ClientEntity | null>;
  findByEmail(email: string): Promise<ClientEntity | null>;
  findAll(): Promise<ClientEntity[]>;
  save(client: ClientEntity): Promise<void>;
  update(client: ClientEntity): Promise<void>;
  delete(id: string): Promise<void>;
  incrementUsedQuota(id: string): Promise<void>;
}
