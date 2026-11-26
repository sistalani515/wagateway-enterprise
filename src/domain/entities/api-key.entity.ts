export interface ApiKeyEntity {
  id: string;
  clientId: string;
  apiKey: string;
  secretKey: string;
  label: string;
  isActive: boolean;
  createdAt: Date;
}
