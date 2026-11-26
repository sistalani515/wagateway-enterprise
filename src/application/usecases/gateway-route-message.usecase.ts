import crypto from 'node:crypto';
import { IApiKeyRepository } from '../../domain/repositories/api-key.repository.interface.js';
import { IClientRepository } from '../../domain/repositories/client.repository.interface.js';
import { IMessageLogRepository } from '../../domain/repositories/message-log.repository.interface.js';
import { IWhatsAppEngineRepository } from '../../domain/repositories/whatsapp-engine.repository.interface.js';
import { IWhatsAppClient } from '../../domain/repositories/whatsapp.client.interface.js';

export class GatewayRouteMessageUseCase {
  constructor(
    private readonly apiKeyRepo: IApiKeyRepository,
    private readonly clientRepo: IClientRepository,
    private readonly engineRepo: IWhatsAppEngineRepository,
    private readonly logRepo: IMessageLogRepository,
    private readonly localWaClient: IWhatsAppClient
  ) {}

  public async execute(params: {
    apiKey?: string;
    to: string;
    text: string;
  }): Promise<{ messageId: string; recipient: string; engineUsed: string; timestamp: number }> {
    const { apiKey, to, text } = params;

    // 1. Validasi Header API Key
    if (!apiKey || !apiKey.trim()) {
      const err = new Error('Header "x-api-key" wajib disertakan');
      (err as any).statusCode = 401;
      (err as any).errorCode = 'MISSING_API_KEY';
      throw err;
    }

    const keyRecord = await this.apiKeyRepo.findByKey(apiKey.trim());
    if (!keyRecord || !keyRecord.isActive) {
      const err = new Error('API Key tidak valid atau telah dinonaktifkan');
      (err as any).statusCode = 403;
      (err as any).errorCode = 'INVALID_API_KEY';
      throw err;
    }

    // 2. Validasi Klien Pemilik Key
    const client = await this.clientRepo.findById(keyRecord.clientId);
    if (!client) {
      const err = new Error('Klien pemilik API Key tidak ditemukan');
      (err as any).statusCode = 403;
      (err as any).errorCode = 'CLIENT_NOT_FOUND';
      throw err;
    }

    // 3. Validasi Status Suspended
    if (client.status === 'suspended') {
      const err = new Error('Akun Anda ditangguhkan oleh Administrator');
      (err as any).statusCode = 403;
      (err as any).errorCode = 'ACCOUNT_SUSPENDED';
      throw err;
    }

    // 4. Validasi Tanggal Expired (Masa Aktif)
    const now = new Date();
    const expiredAt = new Date(client.expiredAt);
    if (now > expiredAt) {
      const err = new Error(`Masa aktif langganan API Anda telah habis pada ${expiredAt.toISOString()}. Silakan hubungi Administrator untuk perpanjangan.`);
      (err as any).statusCode = 403;
      (err as any).errorCode = 'SUBSCRIPTION_EXPIRED';
      throw err;
    }

    // 5. Validasi Batas Kuota Bulanan
    if (client.usedQuota >= client.monthlyQuota) {
      const err = new Error(`Batas kuota pesan bulanan Anda (${client.monthlyQuota} pesan) telah habis`);
      (err as any).statusCode = 429;
      (err as any).errorCode = 'QUOTA_EXCEEDED';
      throw err;
    }

    // 6. Validasi Input Pesan
    if (!to || !to.trim()) {
      const err = new Error('Nomor tujuan (to) wajib diisi');
      (err as any).statusCode = 400;
      (err as any).errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    if (!text || !text.trim()) {
      const err = new Error('Isi pesan (text) wajib diisi');
      (err as any).statusCode = 400;
      (err as any).errorCode = 'VALIDATION_ERROR';
      throw err;
    }

    // 7. Normalisasi Nomor WhatsApp
    let cleanTarget = to.trim().replace(/[^0-9]/g, '');
    if (cleanTarget.startsWith('0')) {
      cleanTarget = '62' + cleanTarget.slice(1);
    }
    if (cleanTarget.length < 8) {
      const err = new Error('Nomor tujuan tidak valid (terlalu pendek)');
      (err as any).statusCode = 400;
      (err as any).errorCode = 'INVALID_PHONE_NUMBER';
      throw err;
    }

    const jid = `${cleanTarget}@s.whatsapp.net`;
    const messageId = `MSG_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // 8. Routing Dinamis ke WhatsApp Engine yang Dialokasikan
    const engineId = client.engineId || 'engine-local-01';
    const engine = await this.engineRepo.findById(engineId);
    const engineName = engine ? engine.name : 'Default Engine';

    try {
      if (engine && engine.type === 'huggingface') {
        // Tembak Node Hugging Face Spaces via HTTP Request dengan shared secret key
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const hfRes = await fetch(`${engine.url}/api/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-secret': engine.secretKey
          },
          body: JSON.stringify({ to: jid, text }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!hfRes.ok) {
          const errorJson: any = await hfRes.json().catch(() => ({}));
          throw new Error(errorJson.error || `Hugging Face Node merespon status ${hfRes.status}`);
        }
      } else {
        // Gunakan Engine Lokal Baileys bawaan
        await this.localWaClient.sendMessage(jid, text);
      }

      // 9. Update Kuota & Simpan Log Sukses
      await this.clientRepo.incrementUsedQuota(client.id);
      await this.logRepo.save({
        id: crypto.randomUUID(),
        clientId: client.id,
        recipient: cleanTarget,
        messageContent: text,
        status: 'sent',
        timestamp: new Date()
      });

      return {
        messageId,
        recipient: jid,
        engineUsed: `${engineId} (${engineName})`,
        timestamp: Math.floor(Date.now() / 1000)
      };
    } catch (sendError: any) {
      await this.logRepo.save({
        id: crypto.randomUUID(),
        clientId: client.id,
        recipient: cleanTarget,
        messageContent: text,
        status: 'failed',
        errorMessage: sendError.message,
        timestamp: new Date()
      });

      const err = new Error(`Gagal mengirim WhatsApp via [${engineName}]: ${sendError.message}`);
      (err as any).statusCode = 502;
      (err as any).errorCode = 'ENGINE_SEND_ERROR';
      throw err;
    }
  }
}
