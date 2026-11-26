import { IWhatsAppClient } from '../../domain/repositories/whatsapp.client.interface.js';

export class SendMessageUseCase {
  constructor(private readonly client: IWhatsAppClient) {}

  public async execute(to: string, text: string): Promise<void> {
    if (!to || !to.trim()) {
      throw new Error('Nomor tujuan (to) wajib diisi');
    }
    if (!text || !text.trim()) {
      throw new Error('Isi pesan (text) wajib diisi');
    }

    let cleanTarget = to.trim();

    // Jika sudah format JID lengkap (@s.whatsapp.net atau @g.us)
    if (cleanTarget.endsWith('@s.whatsapp.net') || cleanTarget.endsWith('@g.us')) {
      await this.client.sendMessage(cleanTarget, text);
      return;
    }

    // Bersihkan karakter non-digit
    cleanTarget = cleanTarget.replace(/[^0-9]/g, '');

    // Normalisasi awalan Indonesia '08' menjadi '628'
    if (cleanTarget.startsWith('0')) {
      cleanTarget = '62' + cleanTarget.slice(1);
    }

    if (cleanTarget.length < 8) {
      throw new Error('Nomor tujuan tidak valid (terlalu pendek)');
    }

    const jid = `${cleanTarget}@s.whatsapp.net`;
    await this.client.sendMessage(jid, text);
  }
}
