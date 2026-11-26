export type ConnectionState = 'disconnected' | 'connecting' | 'qr_ready' | 'connected';

export interface SessionEntity {
  state: ConnectionState;
  qrRaw?: string;
  qrDataUrl?: string;
  connectedNumber?: string;
  userName?: string;
  lastUpdated: Date;
}
