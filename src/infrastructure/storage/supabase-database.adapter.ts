import type { SupabaseClient } from '@supabase/supabase-js';
import { IClientRepository } from '../../domain/repositories/client.repository.interface.js';
import { IApiKeyRepository } from '../../domain/repositories/api-key.repository.interface.js';
import { IDashboardUserRepository } from '../../domain/repositories/dashboard-user.repository.interface.js';
import { IWhatsAppEngineRepository } from '../../domain/repositories/whatsapp-engine.repository.interface.js';
import { ISystemSettingsRepository } from '../../domain/repositories/system-settings.repository.interface.js';
import { IMessageLogRepository } from '../../domain/repositories/message-log.repository.interface.js';
import { ClientEntity } from '../../domain/entities/client.entity.js';
import { ApiKeyEntity } from '../../domain/entities/api-key.entity.js';
import { DashboardUserEntity } from '../../domain/entities/dashboard-user.entity.js';
import { WhatsAppEngineEntity } from '../../domain/entities/whatsapp-engine.entity.js';
import { SystemSettingsEntity } from '../../domain/entities/system-settings.entity.js';
import { MessageLogEntity } from '../../domain/entities/message-log.entity.js';

// 1. Supabase Client Repository
export class SupabaseClientRepository implements IClientRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  public async findById(id: string): Promise<ClientEntity | null> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  public async findByEmail(email: string): Promise<ClientEntity | null> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  public async findAll(): Promise<ClientEntity[]> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((d) => this.mapToEntity(d));
  }

  public async save(client: ClientEntity): Promise<void> {
    await this.supabase.from('clients').insert({
      id: client.id,
      client_name: client.clientName,
      email: client.email || null,
      phone_number: client.phoneNumber || null,
      status: client.status,
      engine_id: client.engineId,
      expired_at: client.expiredAt.toISOString(),
      monthly_quota: client.monthlyQuota,
      used_quota: client.usedQuota,
      created_at: client.createdAt.toISOString(),
      updated_at: client.updatedAt.toISOString()
    });
  }

  public async update(client: ClientEntity): Promise<void> {
    await this.supabase
      .from('clients')
      .update({
        client_name: client.clientName,
        email: client.email || null,
        phone_number: client.phoneNumber || null,
        status: client.status,
        engine_id: client.engineId,
        expired_at: client.expiredAt.toISOString(),
        monthly_quota: client.monthlyQuota,
        used_quota: client.usedQuota,
        updated_at: new Date().toISOString()
      })
      .eq('id', client.id);
  }

  public async delete(id: string): Promise<void> {
    await this.supabase.from('clients').delete().eq('id', id);
  }

  public async incrementUsedQuota(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('deduct_client_quota', { p_client_id: id });
    if (error) {
      const current = await this.findById(id);
      if (current) {
        current.usedQuota += 1;
        await this.update(current);
      }
    }
  }

  private mapToEntity(row: any): ClientEntity {
    return {
      id: row.id,
      clientName: row.client_name,
      email: row.email || undefined,
      phoneNumber: row.phone_number || undefined,
      status: row.status,
      engineId: row.engine_id || 'engine-local-01',
      expiredAt: new Date(row.expired_at),
      monthlyQuota: row.monthly_quota,
      usedQuota: row.used_quota,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

// 2. Supabase API Key Repository
export class SupabaseApiKeyRepository implements IApiKeyRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  public async findByKey(apiKey: string): Promise<ApiKeyEntity | null> {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  public async findByClientId(clientId: string): Promise<ApiKeyEntity[]> {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('client_id', clientId);

    if (error || !data) return [];
    return data.map((d) => this.mapToEntity(d));
  }

  public async findAll(): Promise<ApiKeyEntity[]> {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((d) => this.mapToEntity(d));
  }

  public async save(apiKey: ApiKeyEntity): Promise<void> {
    await this.supabase.from('api_keys').insert({
      id: apiKey.id,
      client_id: apiKey.clientId,
      api_key: apiKey.apiKey,
      secret_key: apiKey.secretKey,
      label: apiKey.label,
      is_active: apiKey.isActive,
      created_at: apiKey.createdAt.toISOString()
    });
  }

  public async update(apiKey: ApiKeyEntity): Promise<void> {
    await this.supabase
      .from('api_keys')
      .update({
        label: apiKey.label,
        is_active: apiKey.isActive,
        secret_key: apiKey.secretKey
      })
      .eq('id', apiKey.id);
  }

  public async delete(id: string): Promise<void> {
    await this.supabase.from('api_keys').delete().eq('id', id);
  }

  private mapToEntity(row: any): ApiKeyEntity {
    return {
      id: row.id,
      clientId: row.client_id,
      apiKey: row.api_key,
      secretKey: row.secret_key,
      label: row.label,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at)
    };
  }
}

// 3. Supabase Dashboard User Repository
export class SupabaseDashboardUserRepository implements IDashboardUserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  public async findById(id: string): Promise<DashboardUserEntity | null> {
    const { data, error } = await this.supabase
      .from('dashboard_users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  public async findByUsername(username: string): Promise<DashboardUserEntity | null> {
    const { data, error } = await this.supabase
      .from('dashboard_users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  public async findAll(): Promise<DashboardUserEntity[]> {
    const { data, error } = await this.supabase
      .from('dashboard_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((d) => this.mapToEntity(d));
  }

  public async save(user: DashboardUserEntity): Promise<void> {
    await this.supabase.from('dashboard_users').insert({
      id: user.id,
      username: user.username,
      password_hash: user.passwordHash,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString()
    });
  }

  public async update(user: DashboardUserEntity): Promise<void> {
    await this.supabase
      .from('dashboard_users')
      .update({
        username: user.username,
        password_hash: user.passwordHash,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
  }

  public async delete(id: string): Promise<void> {
    await this.supabase.from('dashboard_users').delete().eq('id', id);
  }

  private mapToEntity(row: any): DashboardUserEntity {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

// 4. Supabase WhatsApp Engine Repository
export class SupabaseWhatsAppEngineRepository implements IWhatsAppEngineRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  public async findById(id: string): Promise<WhatsAppEngineEntity | null> {
    const { data, error } = await this.supabase
      .from('whatsapp_engines')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  public async findAll(): Promise<WhatsAppEngineEntity[]> {
    const { data, error } = await this.supabase
      .from('whatsapp_engines')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map((d) => this.mapToEntity(d));
  }

  public async save(engine: WhatsAppEngineEntity): Promise<void> {
    await this.supabase.from('whatsapp_engines').insert({
      id: engine.id,
      name: engine.name,
      type: engine.type,
      url: engine.url,
      secret_key: engine.secretKey,
      phone_number: engine.phoneNumber || null,
      status: engine.status,
      last_ping_at: engine.lastPingAt?.toISOString() || null,
      created_at: engine.createdAt.toISOString(),
      updated_at: engine.updatedAt.toISOString()
    });
  }

  public async update(engine: WhatsAppEngineEntity): Promise<void> {
    await this.supabase
      .from('whatsapp_engines')
      .update({
        name: engine.name,
        type: engine.type,
        url: engine.url,
        secret_key: engine.secretKey,
        phone_number: engine.phoneNumber || null,
        status: engine.status,
        last_ping_at: engine.lastPingAt?.toISOString() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', engine.id);
  }

  public async delete(id: string): Promise<void> {
    await this.supabase.from('whatsapp_engines').delete().eq('id', id);
  }

  private mapToEntity(row: any): WhatsAppEngineEntity {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      url: row.url,
      secretKey: row.secret_key,
      phoneNumber: row.phone_number || undefined,
      status: row.status,
      lastPingAt: row.last_ping_at ? new Date(row.last_ping_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

// 5. Supabase System Settings Repository
export class SupabaseSystemSettingsRepository implements ISystemSettingsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  public async getSettings(): Promise<SystemSettingsEntity> {
    const { data } = await this.supabase
      .from('system_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (data) {
      return {
        systemName: data.system_name,
        commandPrefix: data.command_prefix,
        defaultQuota: data.default_quota,
        defaultValidityDays: data.default_validity_days,
        globalWebhookUrl: data.global_webhook_url || undefined,
        maintenanceMode: Boolean(data.maintenance_mode),
        updatedAt: new Date(data.updated_at)
      };
    }

    return {
      systemName: 'WAGateway Enterprise Cloud',
      commandPrefix: '!',
      defaultQuota: 10000,
      defaultValidityDays: 30,
      maintenanceMode: false,
      updatedAt: new Date()
    };
  }

  public async updateSettings(settings: Partial<SystemSettingsEntity>): Promise<SystemSettingsEntity> {
    const current = await this.getSettings();
    const updated: SystemSettingsEntity = { ...current, ...settings, updatedAt: new Date() };

    await this.supabase.from('system_settings').upsert({
      id: 'global',
      system_name: updated.systemName,
      command_prefix: updated.commandPrefix,
      default_quota: updated.defaultQuota,
      default_validity_days: updated.defaultValidityDays,
      global_webhook_url: updated.globalWebhookUrl || null,
      maintenance_mode: updated.maintenanceMode,
      updated_at: updated.updatedAt.toISOString()
    });

    return updated;
  }
}

// 6. Supabase Message Log Repository
export class SupabaseMessageLogRepository implements IMessageLogRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  public async save(log: MessageLogEntity): Promise<void> {
    await this.supabase.from('message_logs').insert({
      id: log.id,
      client_id: log.clientId || null,
      recipient: log.recipient,
      message_content: log.messageContent,
      status: log.status,
      error_message: log.errorMessage || null,
      timestamp: log.timestamp.toISOString()
    });
  }

  public async findRecent(limit = 100): Promise<MessageLogEntity[]> {
    const { data } = await this.supabase
      .from('message_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (!data) return [];
    return data.map((d) => ({
      id: d.id,
      clientId: d.client_id || undefined,
      recipient: d.recipient,
      messageContent: d.message_content,
      status: d.status,
      errorMessage: d.error_message || undefined,
      timestamp: new Date(d.timestamp)
    }));
  }

  public async countTotal(): Promise<number> {
    const { count } = await this.supabase
      .from('message_logs')
      .select('*', { count: 'exact', head: true });

    return count || 0;
  }
}
