import { ApiKeyEntity } from '../entities/api-key.entity.js';

export interface IApiKeyRepository {
  findByKey(apiKey: string): Promise<ApiKeyEntity | null>;
  findByClientId(clientId: string): Promise<ApiKeyEntity[]>;
  findAll(): Promise<ApiKeyEntity[]>;
  save(apiKey: ApiKeyEntity): Promise<void>;
  update(apiKey: ApiKeyEntity): Promise<void>;
  delete(id: string): Promise<void>;
}
