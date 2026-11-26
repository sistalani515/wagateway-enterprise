import crypto from 'node:crypto';
import { IClientRepository } from '../../domain/repositories/client.repository.interface.js';
import { IApiKeyRepository } from '../../domain/repositories/api-key.repository.interface.js';
import { ClientEntity } from '../../domain/entities/client.entity.js';
import { ApiKeyEntity } from '../../domain/entities/api-key.entity.js';

export class ClientManagementUseCase {
  constructor(
    private readonly clientRepo: IClientRepository,
    private readonly apiKeyRepo: IApiKeyRepository
  ) {}

  public async createClient(data: {
    clientName: string;
    email?: string;
    phoneNumber?: string;
    engineId?: string;
    expiredAt: Date;
    monthlyQuota?: number;
  }): Promise<{ client: ClientEntity; apiKey: ApiKeyEntity }> {
    const clientId = crypto.randomUUID();
    const now = new Date();

    const client: ClientEntity = {
      id: clientId,
      clientName: data.clientName.trim(),
      email: data.email?.trim(),
      phoneNumber: data.phoneNumber?.trim(),
      status: now > data.expiredAt ? 'expired' : 'active',
      engineId: data.engineId || 'engine-local-01',
      expiredAt: data.expiredAt,
      monthlyQuota: data.monthlyQuota || 5000,
      usedQuota: 0,
      createdAt: now,
      updatedAt: now
    };

    await this.clientRepo.save(client);
    const apiKey = await this.generateApiKey(clientId, 'Production Key');

    return { client, apiKey };
  }

  public async getAllClients(): Promise<Array<ClientEntity & { apiKeys: ApiKeyEntity[] }>> {
    const clients = await this.clientRepo.findAll();
    const allKeys = await this.apiKeyRepo.findAll();
    const now = new Date();

    return clients.map((c) => {
      let status = c.status;
      if (status !== 'suspended' && now > new Date(c.expiredAt)) {
        status = 'expired';
      }

      return {
        ...c,
        status,
        apiKeys: allKeys.filter((k) => k.clientId === c.id)
      };
    });
  }

  public async updateClient(
    id: string,
    data: {
      clientName?: string;
      email?: string;
      phoneNumber?: string;
      status?: 'active' | 'suspended';
      engineId?: string;
      expiredAt?: Date;
      monthlyQuota?: number;
    }
  ): Promise<ClientEntity> {
    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new Error(`Klien dengan ID ${id} tidak ditemukan`);
    }

    if (data.clientName) client.clientName = data.clientName.trim();
    if (data.email !== undefined) client.email = data.email.trim();
    if (data.phoneNumber !== undefined) client.phoneNumber = data.phoneNumber.trim();
    if (data.status) client.status = data.status;
    if (data.engineId) client.engineId = data.engineId.trim();
    if (data.expiredAt) client.expiredAt = data.expiredAt;
    if (data.monthlyQuota !== undefined) client.monthlyQuota = data.monthlyQuota;
    client.updatedAt = new Date();

    await this.clientRepo.update(client);
    return client;
  }

  public async deleteClient(id: string): Promise<void> {
    await this.clientRepo.delete(id);
    const keys = await this.apiKeyRepo.findByClientId(id);
    for (const k of keys) {
      await this.apiKeyRepo.delete(k.id);
    }
  }

  public async generateApiKey(clientId: string, label: string = 'Production Key'): Promise<ApiKeyEntity> {
    const keyId = crypto.randomUUID();
    const rawRandom = crypto.randomBytes(18).toString('hex');
    const secretRandom = crypto.randomBytes(24).toString('hex');

    const apiKey: ApiKeyEntity = {
      id: keyId,
      clientId,
      apiKey: `wagate_live_${rawRandom}`,
      secretKey: `sec_${secretRandom}`,
      label,
      isActive: true,
      createdAt: new Date()
    };

    await this.apiKeyRepo.save(apiKey);
    return apiKey;
  }

  public async toggleApiKey(keyId: string): Promise<ApiKeyEntity> {
    const keys = await this.apiKeyRepo.findAll();
    const target = keys.find((k) => k.id === keyId);
    if (!target) {
      throw new Error(`API Key dengan ID ${keyId} tidak ditemukan`);
    }

    target.isActive = !target.isActive;
    await this.apiKeyRepo.update(target);
    return target;
  }

  public async deleteApiKey(keyId: string): Promise<void> {
    await this.apiKeyRepo.delete(keyId);
  }
}
