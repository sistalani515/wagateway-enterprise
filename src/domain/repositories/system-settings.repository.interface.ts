import { SystemSettingsEntity } from '../entities/system-settings.entity.js';

export interface ISystemSettingsRepository {
  getSettings(): Promise<SystemSettingsEntity>;
  updateSettings(settings: Partial<SystemSettingsEntity>): Promise<SystemSettingsEntity>;
}
