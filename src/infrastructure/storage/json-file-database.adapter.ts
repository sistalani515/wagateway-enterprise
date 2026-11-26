import fs from 'node:fs';
import path from 'node:path';
import { IClientRepository } from '../../domain/repositories/client.repository.interface.js';
import { IApiKeyRepository } from '../../domain/repositories/api-key.repository.interface.js';
import { IMessageLogRepository } from '../../domain/repositories/message-log.repository.interface.js';
import { IDashboardUserRepository } from '../../domain/repositories/dashboard-user.repository.interface.js';
import { IWhatsAppEngineRepository } from '../../domain/repositories/whatsapp-engine.repository.interface.js';
import { ISystemSettingsRepository } from '../../domain/repositories/system-settings.repository.interface.js';
import { ClientEntity } from '../../domain/entities/client.entity.js';
import { ApiKeyEntity } from '../../domain/entities/api-key.entity.js';
import { MessageLogEntity } from '../../domain/entities/message-log.entity.js';
import { DashboardUserEntity } from '../../domain/entities/dashboard-user.entity.js';
import { WhatsAppEngineEntity } from '../../domain/entities/whatsapp-engine.entity.js';
import { SystemSettingsEntity } from '../../domain/entities/system-settings.entity.js';
import { AuthDashboardUseCase } from '../../application/usecases/auth-dashboard.usecase.js';

interface DatabaseSchema {
  dashboardUsers: DashboardUserEntity[];
  clients: ClientEntity[];
  apiKeys: ApiKeyEntity[];
  engines: WhatsAppEngineEntity[];
  settings: SystemSettingsEntity;
  logs: MessageLogEntity[];
}

export class JsonStorageContext {
  private dbFilePath: string;
  public data: DatabaseSchema = {
    dashboardUsers: [],
    clients: [],
    apiKeys: [],
    engines: [],
    settings: {
      systemName: 'WAGateway Pro Enterprise',
      commandPrefix: '!',
      defaultQuota: 5000,
      defaultValidityDays: 30,
      globalWebhookUrl: '',
      maintenanceMode: false,
      updatedAt: new Date()
    },
    logs: []
  };

  constructor(storageDir: string) {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.dbFilePath = path.join(storageDir, 'database.json');
    this.loadOrCreate();
  }

  public persist(): void {
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[JsonStorageContext] Gagal menyimpan data ke disk:', err);
    }
  }

  private loadOrCreate(): void {
    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          dashboardUsers: (parsed.dashboardUsers || []).map((u: any) => ({
            ...u,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.updatedAt)
          })),
          clients: (parsed.clients || []).map((c: any) => ({
            ...c,
            engineId: c.engineId || 'engine-local-01',
            expiredAt: new Date(c.expiredAt),
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt)
          })),
          apiKeys: (parsed.apiKeys || []).map((k: any) => ({
            ...k,
            createdAt: new Date(k.createdAt)
          })),
          engines: (parsed.engines || []).map((e: any) => ({
            ...e,
            createdAt: new Date(e.createdAt),
            updatedAt: new Date(e.updatedAt)
          })),
          settings: parsed.settings ? {
            ...parsed.settings,
            updatedAt: new Date(parsed.settings.updatedAt)
          } : {
            systemName: 'WAGateway Pro Enterprise',
            commandPrefix: '!',
            defaultQuota: 5000,
            defaultValidityDays: 30,
            globalWebhookUrl: '',
            maintenanceMode: false,
            updatedAt: new Date()
          },
          logs: (parsed.logs || []).map((l: any) => ({
            ...l,
            timestamp: new Date(l.timestamp)
          }))
        };

        if (this.data.dashboardUsers.length === 0) {
          this.seedDefaultAdmin();
        }
        if (this.data.engines.length === 0) {
          this.seedDefaultEngines();
        }
        return;
      } catch (err) {
        console.warn('[JsonStorageContext] Gagal membaca database.json, menggunakan seed:', err);
      }
    }

    this.seedInitialData();
  }

  private seedDefaultAdmin(): void {
    const now = new Date();
    this.data.dashboardUsers.push({
      id: 'admin-super-01',
      username: 'admin',
      email: 'admin@wagateway.local',
      fullName: 'Super Administrator',
      role: 'superadmin',
      passwordHash: AuthDashboardUseCase.hashPassword('admin123'),
      createdAt: now,
      updatedAt: now
    });
    this.persist();
  }

  private seedDefaultEngines(): void {
    const now = new Date();
    this.data.engines = [
      {
        id: 'engine-local-01',
        name: 'Local Baileys Docker Engine',
        type: 'local',
        url: 'http://localhost:7860',
        secretKey: 'sec_local_internal_9876',
        status: 'connected',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'hf-space-01',
        name: 'Hugging Face Worker Space (Primary)',
        type: 'huggingface',
        url: 'https://myorg-wabot-engine.hf.space',
        secretKey: 'sec_hf_live_secret_7777',
        status: 'disconnected',
        createdAt: now,
        updatedAt: now
      }
    ];
    this.persist();
  }

  private seedInitialData(): void {
    const now = new Date();
    const activeClientId = 'client-demo-active-01';
    const expiredClientId = 'client-demo-expired-02';

    const futureDate = new Date();
    futureDate.setFullYear(now.getFullYear() + 1);

    const pastDate = new Date();
    pastDate.setDate(now.getDate() - 10);

    // 1. Dashboard User
    this.data.dashboardUsers = [
      {
        id: 'admin-super-01',
        username: 'admin',
        email: 'admin@wagateway.local',
        fullName: 'Super Administrator',
        role: 'superadmin',
        passwordHash: AuthDashboardUseCase.hashPassword('admin123'),
        createdAt: now,
        updatedAt: now
      }
    ];

    // 2. WhatsApp Engines (Local + HF)
    this.data.engines = [
      {
        id: 'engine-local-01',
        name: 'Local Baileys Docker Engine',
        type: 'local',
        url: 'http://localhost:7860',
        secretKey: 'sec_local_internal_9876',
        status: 'connected',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'hf-space-01',
        name: 'Hugging Face Worker Space (Primary)',
        type: 'huggingface',
        url: 'https://myorg-wabot-engine.hf.space',
        secretKey: 'sec_hf_live_secret_7777',
        status: 'disconnected',
        createdAt: now,
        updatedAt: now
      }
    ];

    // 3. System Settings
    this.data.settings = {
      systemName: 'WAGateway Pro Enterprise',
      commandPrefix: '!',
      defaultQuota: 5000,
      defaultValidityDays: 30,
      globalWebhookUrl: '',
      maintenanceMode: false,
      updatedAt: now
    };

    // 4. Klien API Eksternal
    this.data.clients = [
      {
        id: activeClientId,
        clientName: 'PT Demo Klien (Langganan Aktif)',
        email: 'client@demo.com',
        phoneNumber: '087759895339',
        status: 'active',
        engineId: 'engine-local-01',
        expiredAt: futureDate,
        monthlyQuota: 10000,
        usedQuota: 5,
        createdAt: now,
        updatedAt: now
      },
      {
        id: expiredClientId,
        clientName: 'Toko Sample (Langganan Expired)',
        email: 'expired@demo.com',
        phoneNumber: '081234567890',
        status: 'expired',
        engineId: 'engine-local-01',
        expiredAt: pastDate,
        monthlyQuota: 1000,
        usedQuota: 1000,
        createdAt: now,
        updatedAt: now
      }
    ];

    // 5. API Keys
    this.data.apiKeys = [
      {
        id: 'key-active-01',
        clientId: activeClientId,
        apiKey: 'wagate_live_demo_active_key_12345',
        secretKey: 'sec_demo_active_98765',
        label: 'Production Key Klien Aktif',
        isActive: true,
        createdAt: now
      },
      {
        id: 'key-expired-02',
        clientId: expiredClientId,
        apiKey: 'wagate_live_demo_expired_key_99999',
        secretKey: 'sec_demo_expired_11111',
        label: 'Production Key Klien Expired',
        isActive: true,
        createdAt: now
      }
    ];

    this.data.logs = [];
    this.persist();
  }
}

export class JsonWhatsAppEngineRepository implements IWhatsAppEngineRepository {
  constructor(private readonly ctx: JsonStorageContext) {}

  public async findById(id: string): Promise<WhatsAppEngineEntity | null> {
    const e = this.ctx.data.engines.find((item) => item.id === id);
    return e ? { ...e } : null;
  }

  public async findAll(): Promise<WhatsAppEngineEntity[]> {
    return [...this.ctx.data.engines];
  }

  public async save(engine: WhatsAppEngineEntity): Promise<void> {
    this.ctx.data.engines.push({ ...engine });
    this.ctx.persist();
  }

  public async update(engine: WhatsAppEngineEntity): Promise<void> {
    const index = this.ctx.data.engines.findIndex((item) => item.id === engine.id);
    if (index !== -1) {
      this.ctx.data.engines[index] = { ...engine };
      this.ctx.persist();
    }
  }

  public async delete(id: string): Promise<void> {
    this.ctx.data.engines = this.ctx.data.engines.filter((item) => item.id !== id);
    this.ctx.persist();
  }
}

export class JsonSystemSettingsRepository implements ISystemSettingsRepository {
  constructor(private readonly ctx: JsonStorageContext) {}

  public async getSettings(): Promise<SystemSettingsEntity> {
    return { ...this.ctx.data.settings };
  }

  public async updateSettings(partial: Partial<SystemSettingsEntity>): Promise<SystemSettingsEntity> {
    this.ctx.data.settings = {
      ...this.ctx.data.settings,
      ...partial,
      updatedAt: new Date()
    };
    this.ctx.persist();
    return { ...this.ctx.data.settings };
  }
}

export class JsonDashboardUserRepository implements IDashboardUserRepository {
  constructor(private readonly ctx: JsonStorageContext) {}

  public async findById(id: string): Promise<DashboardUserEntity | null> {
    const u = this.ctx.data.dashboardUsers.find((item) => item.id === id);
    return u ? { ...u } : null;
  }

  public async findByUsername(username: string): Promise<DashboardUserEntity | null> {
    const u = this.ctx.data.dashboardUsers.find((item) => item.username.toLowerCase() === username.toLowerCase());
    return u ? { ...u } : null;
  }

  public async findAll(): Promise<DashboardUserEntity[]> {
    return [...this.ctx.data.dashboardUsers];
  }

  public async save(user: DashboardUserEntity): Promise<void> {
    this.ctx.data.dashboardUsers.push({ ...user });
    this.ctx.persist();
  }

  public async update(user: DashboardUserEntity): Promise<void> {
    const index = this.ctx.data.dashboardUsers.findIndex((item) => item.id === user.id);
    if (index !== -1) {
      this.ctx.data.dashboardUsers[index] = { ...user };
      this.ctx.persist();
    }
  }

  public async delete(id: string): Promise<void> {
    this.ctx.data.dashboardUsers = this.ctx.data.dashboardUsers.filter((item) => item.id !== id);
    this.ctx.persist();
  }
}

export class JsonClientRepository implements IClientRepository {
  constructor(private readonly ctx: JsonStorageContext) {}

  public async findById(id: string): Promise<ClientEntity | null> {
    const c = this.ctx.data.clients.find((item) => item.id === id);
    return c ? { ...c } : null;
  }

  public async findByEmail(email: string): Promise<ClientEntity | null> {
    const c = this.ctx.data.clients.find((item) => item.email === email);
    return c ? { ...c } : null;
  }

  public async findAll(): Promise<ClientEntity[]> {
    return [...this.ctx.data.clients];
  }

  public async save(client: ClientEntity): Promise<void> {
    this.ctx.data.clients.push({ ...client });
    this.ctx.persist();
  }

  public async update(client: ClientEntity): Promise<void> {
    const index = this.ctx.data.clients.findIndex((item) => item.id === client.id);
    if (index !== -1) {
      this.ctx.data.clients[index] = { ...client };
      this.ctx.persist();
    }
  }

  public async delete(id: string): Promise<void> {
    this.ctx.data.clients = this.ctx.data.clients.filter((item) => item.id !== id);
    this.ctx.persist();
  }

  public async incrementUsedQuota(id: string): Promise<void> {
    const client = this.ctx.data.clients.find((item) => item.id === id);
    if (client) {
      client.usedQuota += 1;
      client.updatedAt = new Date();
      this.ctx.persist();
    }
  }
}

export class JsonApiKeyRepository implements IApiKeyRepository {
  constructor(private readonly ctx: JsonStorageContext) {}

  public async findByKey(apiKey: string): Promise<ApiKeyEntity | null> {
    const k = this.ctx.data.apiKeys.find((item) => item.apiKey === apiKey);
    return k ? { ...k } : null;
  }

  public async findByClientId(clientId: string): Promise<ApiKeyEntity[]> {
    return this.ctx.data.apiKeys.filter((item) => item.clientId === clientId);
  }

  public async findAll(): Promise<ApiKeyEntity[]> {
    return [...this.ctx.data.apiKeys];
  }

  public async save(apiKey: ApiKeyEntity): Promise<void> {
    this.ctx.data.apiKeys.push({ ...apiKey });
    this.ctx.persist();
  }

  public async update(apiKey: ApiKeyEntity): Promise<void> {
    const index = this.ctx.data.apiKeys.findIndex((item) => item.id === apiKey.id);
    if (index !== -1) {
      this.ctx.data.apiKeys[index] = { ...apiKey };
      this.ctx.persist();
    }
  }

  public async delete(id: string): Promise<void> {
    this.ctx.data.apiKeys = this.ctx.data.apiKeys.filter((item) => item.id !== id);
    this.ctx.persist();
  }
}

export class JsonMessageLogRepository implements IMessageLogRepository {
  constructor(private readonly ctx: JsonStorageContext) {}

  public async save(log: MessageLogEntity): Promise<void> {
    this.ctx.data.logs.unshift({ ...log });
    if (this.ctx.data.logs.length > 500) {
      this.ctx.data.logs = this.ctx.data.logs.slice(0, 500);
    }
    this.ctx.persist();
  }

  public async findRecent(limit: number = 20): Promise<MessageLogEntity[]> {
    return this.ctx.data.logs.slice(0, limit);
  }

  public async countTotal(): Promise<number> {
    return this.ctx.data.logs.length;
  }
}
