export type ClientStatus = 'active' | 'suspended' | 'expired';

export interface ClientEntity {
  id: string;
  clientName: string;
  email?: string;
  phoneNumber?: string;
  status: ClientStatus;
  engineId: string;              // ID WhatsApp Engine / Hugging Face yang dialokasikan
  expiredAt: Date;               // Tanggal kadaluwarsa langganan
  monthlyQuota: number;          // Kuota pesan bulanan
  usedQuota: number;             // Pesan yang sudah dikirim
  createdAt: Date;
  updatedAt: Date;
}
