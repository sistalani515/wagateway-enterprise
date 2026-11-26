import { Router, Request, Response } from 'express';
import { GatewayRouteMessageUseCase } from '../../application/usecases/gateway-route-message.usecase.js';
import { GetClientStatusUseCase } from '../../application/usecases/get-client-status.usecase.js';
import { IWhatsAppClient } from '../../domain/repositories/whatsapp.client.interface.js';
import { ENV } from '../../config/env.js';

export function createGatewayRouter(
  gatewayUseCase: GatewayRouteMessageUseCase,
  statusUseCase: GetClientStatusUseCase,
  whatsappClient?: IWhatsAppClient
): Router {
  const router = Router();

  // 1. Endpoint Kirim Pesan: POST /v1/messages/send
  router.post('/messages/send', async (req: Request, res: Response) => {
    const apiKey = (req.headers['x-api-key'] as string) || (req.query.api_key as string);
    const engineSecret = req.headers['x-engine-secret'] as string;
    const to = req.body.to || req.body.recipient || req.body.phone || req.body.number;
    const text = req.body.text || req.body.message || req.body.content;

    // Verifikasi Internal Engine Secret dari Cloudflare Worker
    const isInternalEngineAuthorized =
      Boolean(engineSecret && ENV.INTERNAL_ENGINE_SECRET && engineSecret === ENV.INTERNAL_ENGINE_SECRET);

    try {
      if (isInternalEngineAuthorized && whatsappClient) {
        if (!to || !to.trim()) {
          return res.status(400).json({ success: false, error_code: 'MISSING_RECIPIENT', message: 'Nomor tujuan (to) wajib diisi' });
        }
        if (!text || !text.trim()) {
          return res.status(400).json({ success: false, error_code: 'MISSING_TEXT', message: 'Pesan teks (text) wajib diisi' });
        }

        // Normalisasi nomor tujuan
        let clean = to.replace(/[^0-9]/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);
        if (!clean.includes('@')) clean = clean + '@s.whatsapp.net';

        await whatsappClient.sendMessage(clean, text);
        return res.status(200).json({
          success: true,
          message: 'Pesan berhasil dikirim via internal engine direct channel',
          data: {
            messageId: `INT_${Date.now()}`,
            recipient: clean,
            engineUsed: ENV.SESSION_ID,
            timestamp: Date.now()
          }
        });
      }

      // Default: Validasi API Key klien & kuota
      const result = await gatewayUseCase.execute({ apiKey, to, text });
      return res.status(200).json({
        success: true,
        message: 'Pesan berhasil dikirim',
        data: result
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const errorCode = err.errorCode || 'INTERNAL_ERROR';

      return res.status(statusCode).json({
        success: false,
        error_code: errorCode,
        message: err.message
      });
    }
  });

  // 2. Endpoint Cek Status Akun Klien: GET /v1/account/status
  router.get('/account/status', async (req: Request, res: Response) => {
    const apiKey = (req.headers['x-api-key'] as string) || (req.query.api_key as string);

    try {
      const statusData = await statusUseCase.execute(apiKey);
      return res.status(200).json({
        success: true,
        data: statusData
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const errorCode = err.errorCode || 'INTERNAL_ERROR';

      return res.status(statusCode).json({
        success: false,
        error_code: errorCode,
        message: err.message
      });
    }
  });

  // 3. Endpoint Dokumentasi API Spesifikasi: GET /v1/docs
  router.get('/docs', (req: Request, res: Response) => {
    res.json({
      title: 'WhatsApp Gateway REST API v1 Specification',
      version: '1.0.0',
      authentication: {
        type: 'ApiKeyHeader',
        header_name: 'x-api-key'
      },
      endpoints: [
        {
          path: '/v1/messages/send',
          method: 'POST',
          description: 'Kirim pesan teks WhatsApp ke nomor tujuan.',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'REQUIRED: Kunci API klien Anda'
          },
          body: {
            to: 'string (Nomor tujuan: misal 087759895339 atau 6287759895339)',
            text: 'string (Isi pesan teks)'
          },
          responses: {
            200: { success: true, message: 'Pesan berhasil dikirim' },
            401: { success: false, error_code: 'MISSING_API_KEY' },
            403: { success: false, error_code: 'SUBSCRIPTION_EXPIRED / INVALID_API_KEY / ACCOUNT_SUSPENDED' },
            429: { success: false, error_code: 'QUOTA_EXCEEDED' }
          }
        },
        {
          path: '/v1/account/status',
          method: 'GET',
          description: 'Cek sisa kuota dan tanggal expired masa aktif akun Anda.',
          headers: {
            'x-api-key': 'REQUIRED: Kunci API klien Anda'
          }
        }
      ]
    });
  });

  return router;
}
