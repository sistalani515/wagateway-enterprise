import { IApiKeyRepository } from '../../domain/repositories/api-key.repository.interface.js';
import { IClientRepository } from '../../domain/repositories/client.repository.interface.js';

export class GetClientStatusUseCase {
  constructor(
    private readonly apiKeyRepo: IApiKeyRepository,
    private readonly clientRepo: IClientRepository
  ) {}

  public async execute(apiKey?: string): Promise<{
    clientName: string;
    email?: string;
    status: string;
    expiredAt: string;
    daysRemaining: number;
    quota: {
      monthlyLimit: number;
      used: number;
      remaining: number;
    };
  }> {
    if (!apiKey || !apiKey.trim()) {
      const err = new Error('Header "x-api-key" wajib disertakan');
      (err as any).statusCode = 401;
      (err as any).errorCode = 'MISSING_API_KEY';
      throw err;
    }

    const keyRecord = await this.apiKeyRepo.findByKey(apiKey.trim());
    if (!keyRecord || !keyRecord.isActive) {
      const err = new Error('API Key tidak valid atau dinonaktifkan');
      (err as any).statusCode = 403;
      (err as any).errorCode = 'INVALID_API_KEY';
      throw err;
    }

    const client = await this.clientRepo.findById(keyRecord.clientId);
    if (!client) {
      const err = new Error('Data Klien tidak ditemukan');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'CLIENT_NOT_FOUND';
      throw err;
    }

    const now = new Date();
    const expDate = new Date(client.expiredAt);
    const diffTime = expDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    let effectiveStatus = client.status;
    if (effectiveStatus !== 'suspended' && now > expDate) {
      effectiveStatus = 'expired';
    }

    return {
      clientName: client.clientName,
      email: client.email,
      status: effectiveStatus,
      expiredAt: expDate.toISOString(),
      daysRemaining,
      quota: {
        monthlyLimit: client.monthlyQuota,
        used: client.usedQuota,
        remaining: Math.max(0, client.monthlyQuota - client.usedQuota)
      }
    };
  }
}
