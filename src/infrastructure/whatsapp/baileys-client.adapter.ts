import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useSupabaseAuthState } from './supabase-baileys-auth.adapter.js';
import { IWhatsAppClient } from '../../domain/repositories/whatsapp.client.interface.js';
import { MessageEntity } from '../../domain/entities/message.entity.js';
import { SessionEntity } from '../../domain/entities/session.entity.js';

export class BaileysClientAdapter implements IWhatsAppClient {
  private socket: WASocket | null = null;
  private messageHandlers: Array<(message: MessageEntity) => Promise<void>> = [];
  private statusHandlers: Array<(session: SessionEntity) => void> = [];
  private readonly authDir: string;
  private clearRemoteSessionFn: (() => Promise<void>) | null = null;
  private session: SessionEntity = {
    state: 'disconnected',
    lastUpdated: new Date()
  };

  constructor(
    private readonly sessionDir: string,
    private readonly autoReconnect: boolean = true,
    private readonly supabase?: SupabaseClient,
    private readonly sessionId: string = 'engine-primary'
  ) {
    this.authDir = path.join(this.sessionDir, 'baileys_auth');
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
    this.migrateLegacySession();
  }

  private migrateLegacySession(): void {
    try {
      const legacyCreds = path.join(this.sessionDir, 'creds.json');
      const targetCreds = path.join(this.authDir, 'creds.json');
      if (fs.existsSync(legacyCreds) && !fs.existsSync(targetCreds)) {
        console.log('[BaileysAdapter] Memindahkan sesi kredensial ke subfolder baileys_auth...');
        const entries = fs.readdirSync(this.sessionDir);
        for (const entry of entries) {
          if (entry === 'database.json' || entry === 'baileys_auth') continue;
          const src = path.join(this.sessionDir, entry);
          const dst = path.join(this.authDir, entry);
          try {
            fs.renameSync(src, dst);
          } catch {}
        }
      }
    } catch (e) {
      console.warn('[BaileysAdapter] Gagal migrasi file sesi:', e);
    }
  }

  public async connect(): Promise<void> {
    try {
      this.updateSession({ state: 'connecting' });

      let state: any;
      let saveCreds: () => Promise<void>;

      if (this.supabase) {
        console.log(`[BaileysAdapter] ☁️ Menggunakan Supabase Auth Store (Persistent Cloud Session: "${this.sessionId}")...`);
        const remoteAuth = await useSupabaseAuthState(this.supabase, this.sessionId);
        state = remoteAuth.state;
        saveCreds = remoteAuth.saveCreds;
        this.clearRemoteSessionFn = remoteAuth.clearSession;
      } else {
        console.log(`[BaileysAdapter] 📂 Menggunakan Local File Auth Store (${this.authDir})...`);
        const localAuth = await useMultiFileAuthState(this.authDir);
        state = localAuth.state;
        saveCreds = localAuth.saveCreds;
      }

      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`[BaileysAdapter] Menggunakan versi WhatsApp v${version.join('.')}, isLatest: ${isLatest}`);

      const logger = pino({ level: 'silent' });

      this.socket = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: true,
        generateHighQualityLinkPreview: true,
        browser: ['Ubuntu', 'Chrome', '20.0.04']
      });

      this.socket.ev.on('creds.update', saveCreds);

      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrDataUrl = await qrcode.toDataURL(qr);
            this.updateSession({
              state: 'qr_ready',
              qrRaw: qr,
              qrDataUrl
            });
            console.log('[BaileysAdapter] QR Code baru siap dipindai di web dashboard');
          } catch (err) {
            console.error('[BaileysAdapter] Gagal membuat QR Data URL:', err);
          }
        }

        if (connection === 'open') {
          const connectedJid = this.socket?.user?.id || '';
          const phone = connectedJid.split(':')[0] || connectedJid.split('@')[0];
          const name = this.socket?.user?.name || 'WhatsApp User';

          this.updateSession({
            state: 'connected',
            qrRaw: undefined,
            qrDataUrl: undefined,
            connectedNumber: phone,
            userName: name
          });
          console.log(`[BaileysAdapter] ✅ Terhubung sebagai: ${name} (${phone})`);
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;

          console.warn(`[BaileysAdapter] Koneksi tertutup. Status Code: ${statusCode}, LoggedOut: ${isLoggedOut}`);

          this.updateSession({
            state: 'disconnected',
            qrRaw: undefined,
            qrDataUrl: undefined
          });

          if (isLoggedOut) {
            console.log('[BaileysAdapter] Sesi logged out. Membersihkan sesi dan menghasilkan QR baru...');
            if (this.clearRemoteSessionFn) {
              await this.clearRemoteSessionFn();
            }
            try {
              if (fs.existsSync(this.authDir)) {
                fs.rmSync(this.authDir, { recursive: true, force: true });
                fs.mkdirSync(this.authDir, { recursive: true });
              }
            } catch (err) {
              console.error('[BaileysAdapter] Gagal membersihkan folder sesi auth:', err);
            }
            setTimeout(() => {
              this.connect();
            }, 1500);
          } else if (this.autoReconnect) {
            console.log('[BaileysAdapter] Menghubungkan ulang dalam 3 detik...');
            setTimeout(() => {
              this.connect();
            }, 3000);
          }
        }
      });

      this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
          if (!msg.message) continue;

          const remoteJid = msg.key.remoteJid || '';
          const isFromMe = Boolean(msg.key.fromMe);
          const isGroup = remoteJid.endsWith('@g.us');

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            '';

          if (!text) continue;

          const messageEntity: MessageEntity = {
            id: msg.key.id || String(Date.now()),
            sender: remoteJid,
            senderName: msg.pushName || undefined,
            text,
            isFromMe,
            isGroup,
            timestamp: typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp : Date.now()
          };

          for (const handler of this.messageHandlers) {
            try {
              await handler(messageEntity);
            } catch (err) {
              console.error('[BaileysAdapter] Error di message handler:', err);
            }
          }
        }
      });
    } catch (error) {
      console.error('[BaileysAdapter] Gagal menginisialisasi koneksi:', error);
      this.updateSession({ state: 'disconnected' });
    }
  }

  public async disconnect(): Promise<void> {
    if (this.socket) {
      try {
        await this.socket.logout();
      } catch (err) {
        console.warn('[BaileysAdapter] Error saat logout:', err);
      }
      this.socket = null;
    }
    if (this.clearRemoteSessionFn) {
      try {
        await this.clearRemoteSessionFn();
      } catch {}
    }
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        fs.mkdirSync(this.authDir, { recursive: true });
      }
    } catch {}
    this.updateSession({ state: 'disconnected', qrRaw: undefined, qrDataUrl: undefined });
  }

  public async sendMessage(to: string, text: string): Promise<void> {
    if (!this.socket || this.session.state !== 'connected') {
      throw new Error('WhatsApp client belum terhubung');
    }
    await this.socket.sendMessage(to, { text });
  }

  public onMessage(handler: (message: MessageEntity) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  public onStatusChange(handler: (session: SessionEntity) => void): void {
    this.statusHandlers.push(handler);
  }

  public getSession(): SessionEntity {
    return this.session;
  }

  private updateSession(partial: Partial<SessionEntity>): void {
    this.session = {
      ...this.session,
      ...partial,
      lastUpdated: new Date()
    };
    for (const handler of this.statusHandlers) {
      try {
        handler(this.session);
      } catch (err) {
        console.error('[BaileysAdapter] Error di status handler:', err);
      }
    }
  }
}
