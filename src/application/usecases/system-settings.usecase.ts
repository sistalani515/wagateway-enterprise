import { ISystemSettingsRepository } from '../../domain/repositories/system-settings.repository.interface.js';
import { SystemSettingsEntity } from '../../domain/entities/system-settings.entity.js';

export class SystemSettingsUseCase {
  constructor(private readonly settingsRepo: ISystemSettingsRepository) {}

  public async getSettings(): Promise<SystemSettingsEntity> {
    return await this.settingsRepo.getSettings();
  }

  public async updateSettings(data: Partial<SystemSettingsEntity>): Promise<SystemSettingsEntity> {
    return await this.settingsRepo.updateSettings(data);
  }
}
