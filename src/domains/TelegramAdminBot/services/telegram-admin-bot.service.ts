import {
  CreateTelegramAdminLinkRequest,
  CreateTelegramAdminLinkResponse,
  TelegramWebhookPayload,
} from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';
import { TelegramAdminLinkService } from './telegram-admin-link.service';
import { TelegramAdminWebhookService } from './telegram-admin-webhook.service';

export class TelegramAdminBotService {
  static async handleUpdate(update: TelegramWebhookPayload) {
    return TelegramAdminWebhookService.handleUpdate(update);
  }

  static async handleCommand(message: any, adminUserId = 0) {
    return TelegramAdminWebhookService.handleCommand(message, adminUserId);
  }

  static async handleCallback(callback: any, adminUserId = 0) {
    return TelegramAdminWebhookService.handleCallback(callback, adminUserId);
  }

  static async createLinkCode(
    payload: CreateTelegramAdminLinkRequest,
    requestedByUserId: number
  ): Promise<CreateTelegramAdminLinkResponse> {
    return TelegramAdminLinkService.createLinkCode(payload, requestedByUserId);
  }

  static consumeLinkCode(code: string) {
    return TelegramAdminLinkService.consumeLinkCode(code);
  }
}
