export interface SystemSettingsEntity {
  systemName: string;
  commandPrefix: string;
  defaultQuota: number;
  defaultValidityDays: number;
  globalWebhookUrl?: string;
  maintenanceMode: boolean;
  updatedAt: Date;
}
