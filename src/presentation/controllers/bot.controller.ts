import { Router, Request, Response } from 'express';
import { IWhatsAppClient } from '../../domain/repositories/whatsapp.client.interface.js';
import { SendMessageUseCase } from '../../application/usecases/send-message.usecase.js';
import { renderDashboardHtml } from '../views/dashboard.html.js';

export function createBotRouter(
  whatsappClient: IWhatsAppClient,
  sendMessageUseCase: SendMessageUseCase
): Router {
  const router = Router();

  // Dashboard UI (bisa dibuka langsung di Browser / Hugging Face Spaces)
  router.get('/', (req: Request, res: Response) => {
    const session = whatsappClient.getSession();
    res.setHeader('Content-Type', 'text/html');
    res.send(renderDashboardHtml(session));
  });

  // REST API: Cek status koneksi
  router.get('/api/status', (req: Request, res: Response) => {
    const session = whatsappClient.getSession();
    res.json({
      success: true,
      data: session
    });
  });

  // REST API: Kirim pesan WhatsApp
  router.post('/api/send', async (req: Request, res: Response) => {
    try {
      const { to, text } = req.body;
      if (!to || !text) {
        return res.status(400).json({
          success: false,
          error: 'Parameter "to" dan "text" wajib diisi'
        });
      }

      await sendMessageUseCase.execute(to, text);
      return res.json({
        success: true,
        message: 'Pesan berhasil dikirim'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Gagal mengirim pesan'
      });
    }
  });

  return router;
}
