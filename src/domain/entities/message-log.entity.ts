export type LogStatus = 'sent' | 'failed' | 'rejected';

export interface MessageLogEntity {
  id: string;
  clientId?: string;
  recipient: string;
  messageContent: string;
  status: LogStatus;
  errorMessage?: string;
  timestamp: Date;
}
