import { IWhatsAppEngineRepository } from '../../domain/repositories/whatsapp-engine.repository.interface.js';
import { WhatsAppEngineEntity } from '../../domain/entities/whatsapp-engine.entity.js';
import { SessionEntity } from '../../domain/entities/session.entity.js';

export class WhatsAppEngineManagementUseCase {
  constructor(private readonly engineRepo: IWhatsAppEngineRepository) {}

  public async listEngines(): Promise<WhatsAppEngineEntity[]> {
    return await this.engineRepo.findAll();
  }

  public async createEngine(data: {
    id: string;
    name: string;
    type: 'local' | 'huggingface';
    url: string;
    secretKey: string;
  }): Promise<WhatsAppEngineEntity> {
    const existing = await this.engineRepo.findById(data.id.trim());
    if (existing) {
      throw new Error(`Engine dengan ID "${data.id}" sudah ada`);
    }

    const now = new Date();
    const newEngine: WhatsAppEngineEntity = {
      id: data.id.trim(),
      name: data.name.trim(),
      type: data.type || 'huggingface',
      url: data.url.trim().replace(/\/+$/, ''),
      secretKey: data.secretKey.trim(),
      status: data.type === 'local' ? 'connected' : 'disconnected',
      createdAt: now,
      updatedAt: now
    };

    await this.engineRepo.save(newEngine);
    return newEngine;
  }

  public async updateEngine(
    id: string,
    data: {
      name?: string;
      url?: string;
      secretKey?: string;
      status?: 'connected' | 'disconnected' | 'qr_ready';
      phoneNumber?: string;
    }
  ): Promise<WhatsAppEngineEntity> {
    const engine = await this.engineRepo.findById(id);
    if (!engine) {
      throw new Error(`Engine dengan ID "${id}" tidak ditemukan`);
    }

    if (data.name) engine.name = data.name.trim();
    if (data.url) engine.url = data.url.trim().replace(/\/+$/, '');
    if (data.secretKey) engine.secretKey = data.secretKey.trim();
    if (data.status) engine.status = data.status;
    if (data.phoneNumber !== undefined) engine.phoneNumber = data.phoneNumber;
    engine.updatedAt = new Date();

    await this.engineRepo.update(engine);
    return engine;
  }

  public async deleteEngine(id: string): Promise<void> {
    const engine = await this.engineRepo.findById(id);
    if (!engine) return;
    if (engine.type === 'local') {
      throw new Error('Engine lokal bawaan tidak boleh dihapus');
    }
    await this.engineRepo.delete(id);
  }

  public async pingEngine(id: string): Promise<{ success: boolean; latencyMs: number; status: string }> {
    const engine = await this.engineRepo.findById(id);
    if (!engine) throw new Error('Engine tidak ditemukan');

    const start = Date.now();
    try {
      if (engine.type === 'local') {
        engine.lastPingAt = new Date();
        await this.engineRepo.update(engine);
        return { success: true, latencyMs: 2, status: engine.status };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${engine.url}/api/status`, {
        headers: { 'x-service-secret': engine.secretKey },
        signal: controller.signal
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - start;
      const ok = res.ok;
      engine.status = ok ? 'connected' : 'disconnected';
      engine.lastPingAt = new Date();
      await this.engineRepo.update(engine);

      return { success: ok, latencyMs, status: engine.status };
    } catch {
      engine.status = 'disconnected';
      await this.engineRepo.update(engine);
      return { success: false, latencyMs: Date.now() - start, status: 'disconnected' };
    }
  }

  public async getEngineStatusAndQr(
    id: string,
    localSession: SessionEntity
  ): Promise<{
    id: string;
    name: string;
    type: string;
    state: string;
    connectedNumber?: string;
    userName?: string;
    qrDataUrl?: string;
  }> {
    const engine = await this.engineRepo.findById(id);
    if (!engine) throw new Error(`Engine dengan ID "${id}" tidak ditemukan`);

    if (engine.type === 'local') {
      return {
        id: engine.id,
        name: engine.name,
        type: 'local',
        state: localSession.state,
        connectedNumber: localSession.connectedNumber,
        userName: localSession.userName,
        qrDataUrl: localSession.qrDataUrl
      };
    }

    // Ambil status & QR dari remote Hugging Face Space
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${engine.url}/api/status`, {
        headers: { 'x-service-secret': engine.secretKey },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          id: engine.id,
          name: engine.name,
          type: 'huggingface',
          state: 'disconnected'
        };
      }

      const json: any = await res.json();
      const remoteData = json.data || {};

      return {
        id: engine.id,
        name: engine.name,
        type: 'huggingface',
        state: remoteData.state || 'disconnected',
        connectedNumber: remoteData.connectedNumber,
        userName: remoteData.userName,
        qrDataUrl: remoteData.qrDataUrl
      };
    } catch {
      return {
        id: engine.id,
        name: engine.name,
        type: 'huggingface',
        state: 'disconnected'
      };
    }
  }
}
