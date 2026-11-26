import { SessionEntity } from '../../domain/entities/session.entity.js';
import { ENV } from '../../config/env.js';

export function renderDashboardHtml(session: SessionEntity): string {
  const isConnected = session.state === 'connected';
  const isQrReady = session.state === 'qr_ready';
  const statusColor = isConnected ? '#10b981' : isQrReady ? '#f59e0b' : '#ef4444';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ENV.BOT_NAME} - Control Center</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --muted: #94a3b8;
      --primary: #2563eb;
      --accent: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      width: 100%;
      max-width: 540px;
      background: var(--card-bg);
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: 12px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${statusColor};
      box-shadow: 0 0 8px ${statusColor};
    }
    .qr-box {
      background: #ffffff;
      padding: 16px;
      border-radius: 12px;
      width: 256px;
      height: 256px;
      margin: 20px auto;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .qr-box img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .info-card {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 10px;
      padding: 16px;
      margin-top: 20px;
      font-size: 14px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .info-row:last-child { border-bottom: none; }
    .commands {
      margin-top: 20px;
      font-size: 13px;
      color: var(--muted);
      line-height: 1.6;
    }
    code {
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      color: #38bdf8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🤖 ${ENV.BOT_NAME}</h2>
      <p style="color: var(--muted); font-size: 14px; margin-top: 4px;">Clean Architecture & Baileys Multi-Device</p>
      <div class="badge">
        <span class="dot"></span>
        <span id="status-text">${session.state.toUpperCase()}</span>
      </div>
    </div>

    ${
      isQrReady && session.qrDataUrl
        ? `<div class="qr-box"><img src="${session.qrDataUrl}" alt="Scan QR WhatsApp" /></div>
           <p style="text-align: center; font-size: 14px; color: var(--muted);">Buka WhatsApp di HP &rarr; Perangkat Tertaut &rarr; Tautkan Perangkat</p>`
        : isConnected
        ? `<div style="text-align: center; padding: 24px 0;">
             <div style="font-size: 48px;">✅</div>
             <h3 style="margin-top: 10px; color: var(--accent);">Bot Siap Digunakan!</h3>
             <p style="color: var(--muted); font-size: 14px; margin-top: 4px;">Tersambung sebagai <b>${session.userName || 'WhatsApp User'}</b> (${session.connectedNumber || '-'})</p>
           </div>`
        : `<div style="text-align: center; padding: 40px 0; color: var(--muted);">
             <p>Sedang menghubungkan ke server WhatsApp...</p>
             <p style="font-size: 12px; margin-top: 8px;">Halaman akan memperbarui status secara otomatis.</p>
           </div>`
    }

    <div class="info-card">
      <div class="info-row"><span style="color: var(--muted);">Status Mesin</span><span>Docker Container</span></div>
      <div class="info-row"><span style="color: var(--muted);">Prefix Perintah</span><code>${ENV.COMMAND_PREFIX}</code></div>
      <div class="info-row"><span style="color: var(--muted);">Engine</span><span>@whiskeysockets/baileys</span></div>
      <div class="info-row"><span style="color: var(--muted);">Terakhir Diperbarui</span><span>${new Date(session.lastUpdated).toLocaleTimeString()}</span></div>
    </div>

    <div class="commands">
      <b>Contoh Perintah Chat:</b><br/>
      • <code>${ENV.COMMAND_PREFIX}ping</code> - Cek respons & uptime bot<br/>
      • <code>${ENV.COMMAND_PREFIX}info</code> - Informasi RAM dan Node.js<br/>
      • <code>${ENV.COMMAND_PREFIX}echo halo dunia</code> - Tes balasan echo<br/>
      • <code>${ENV.COMMAND_PREFIX}help</code> - Menampilkan menu bot
    </div>
  </div>

  <script>
    // Auto refresh jika belum terhubung agar QR code termutakhirkan
    ${!isConnected ? `
    setTimeout(() => {
      window.location.reload();
    }, 6000);
    ` : ''}
  </script>
</body>
</html>`;
}
