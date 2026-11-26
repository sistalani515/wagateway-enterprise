import { MessageEntity } from '../../domain/entities/message.entity.js';
import { IWhatsAppClient } from '../../domain/repositories/whatsapp.client.interface.js';
import { BotCommandService } from '../services/bot-command.service.js';

export class HandleMessageUseCase {
  constructor(
    private readonly client: IWhatsAppClient,
    private readonly commandService: BotCommandService
  ) {}

  public async execute(message: MessageEntity): Promise<void> {
    if (message.isFromMe) {
      return;
    }

    try {
      const replyText = await this.commandService.process(message);
      if (replyText) {
        await this.client.sendMessage(message.sender, replyText);
      }
    } catch (error) {
      console.error(`[HandleMessageUseCase] Error handling message from ${message.sender}:`, error);
    }
  }
}
