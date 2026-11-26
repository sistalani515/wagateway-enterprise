export interface WhatsAppEngineEntity {
  id: string;                      // Contoh: 'engine-local-01', 'hf-jakarta-02'
  name: string;                    // Nama label: 'Local Docker Engine', 'HF Primary'
  type: 'local' | 'huggingface';   // Tipe engine
  url: string;                     // URL Hugging Face atau localhost (http://localhost:7860)
  secretKey: string;               // Secret key x-service-secret
  phoneNumber?: string;            // Nomor WA yang terhubung
  status: 'connected' | 'disconnected' | 'qr_ready';
  lastPingAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
