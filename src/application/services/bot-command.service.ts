import { ENV } from '../../config/env.js';
import { MessageEntity } from '../../domain/entities/message.entity.js';

export class BotCommandService {
  private startTime = Date.now();

  public async process(message: MessageEntity): Promise<string | null> {
    const rawText = message.text.trim();
    if (!rawText.startsWith(ENV.COMMAND_PREFIX)) {
      return null;
    }

    const [cmd, ...args] = rawText.slice(ENV.COMMAND_PREFIX.length).split(' ');
    const command = cmd.toLowerCase();

    switch (command) {
      case 'ping': {
        const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        return `🏓 *Pong!*\n\n• Status: Online\n• Host: Docker / Cloud\n• Uptime: ${uptimeSeconds}s`;
      }

      case 'help':
      case 'menu': {
        return `🤖 *${ENV.BOT_NAME} Menu*\n\n` +
          `• *${ENV.COMMAND_PREFIX}ping* - Cek status bot & uptime\n` +
          `• *${ENV.COMMAND_PREFIX}info* - Informasi sistem & arsitektur\n` +
          `• *${ENV.COMMAND_PREFIX}echo <teks>* - Mengulangi pesan Anda\n` +
          `• *${ENV.COMMAND_PREFIX}help* - Menampilkan pesan ini\n\n` +
          `_Dibangun dengan Clean Architecture & Baileys Multi-Device._`;
      }

      case 'info': {
        const memoryUsage = process.memoryUsage();
        const rssMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);
        return `ℹ️ *System Info*\n\n` +
          `• Node.js: ${process.version}\n` +
          `• Platform: ${process.platform}\n` +
          `• RAM Digunakan: ${rssMB} MB\n` +
          `• Engine: @whiskeysockets/baileys\n` +
          `• Arsitektur: Clean Architecture (Domain, UseCase, Infra)`;
      }

      case 'echo': {
        if (args.length === 0) {
          return `⚠️ Gunakan: *${ENV.COMMAND_PREFIX}echo <pesan>*`;
        }
        return args.join(' ');
      }

      default:
        return null;
    }
  }
}
