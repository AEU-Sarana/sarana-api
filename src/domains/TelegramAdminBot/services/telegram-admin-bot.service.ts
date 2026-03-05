import {
  CreateTelegramAdminLinkRequest,
  CreateTelegramAdminLinkResponse,
  TelegramWebhookPayload,
} from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';
import { TelegramAdminLinkService } from './telegram-admin-link.service';
import { TelegramAdminWebhookService } from './telegram-admin-webhook.service';

export class TelegramAdminBotService {
  static async handleUpdate(update: TelegramWebhookPayload, tenantId: number) {
    return TelegramAdminWebhookService.handleUpdate(update, tenantId);
  }

  static async handleCommand(message: any, tenantId: number, adminUserId = 0) {
    return TelegramAdminWebhookService.handleCommand(message, tenantId, adminUserId);
  }

  static async handleCallback(callback: any, tenantId: number, adminUserId = 0) {
    return TelegramAdminWebhookService.handleCallback(callback, tenantId, adminUserId);
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
