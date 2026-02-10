import { TelegramAdminLinksService } from '@src/domains/TelegramAdminBot/services/telegram-admin-links.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { toPhnomPenhISOString } from '@src/shared/utils/date-utils';
import { UserService } from '@src/domains/User/services/user.service';
import { UserRole } from '@src/domains/User/enums';
import { randomInt } from 'crypto';
import {
  CreateTelegramAdminLinkRequest,
  CreateTelegramAdminLinkResponse,
  PendingTelegramAdminLink,
} from '@src/domains/TelegramAdminBot/types/telegram-admin-bot.types';
import {
  DEFAULT_EXPIRES_MINUTES,
  pendingLinks,
  linkAttempts,
} from './telegram-admin-state.service';

export class TelegramAdminLinkService {
  static async createLinkCode(
    payload: CreateTelegramAdminLinkRequest,
    requestedByUserId: number
  ): Promise<CreateTelegramAdminLinkResponse> {
    const adminId = payload.admin_user_id;

    //1) Verify requester
    if (!requestedByUserId || requestedByUserId !== adminId) {
      throw new Error('FORBIDDEN');
    }

    //2) Verify admin role
    const admin = await UserService.getUser(adminId, requestedByUserId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new Error('NOT_ADMIN');
    }

    const minutes = payload.expires_in_minutes ?? DEFAULT_EXPIRES_MINUTES;
    const expiresAtMs = Date.now() + minutes * 60 * 1000;
    const linkCode = this.generateLinkCode();

    pendingLinks.set(linkCode, {
      adminUserId: adminId,
      telegramUserId: payload.telegram_user_id,
      telegramUsername: payload.telegram_username,
      expiresAtMs,
    });

    await auditLogService.createAuditLog({
      action: 'CREATE_TELEGRAM_LINK_CODE',
      userId: adminId,
      resource: 'telegram_admin_bot',
      entityId: adminId,
      details: { link_code: linkCode, expires_in_minutes: minutes },
    });

    return {
      link_code: linkCode,
      expires_at: toPhnomPenhISOString(new Date(expiresAtMs)),
      link_status: 'PENDING',
    };
  }

  static consumeLinkCode(code: string): PendingTelegramAdminLink | null {
    const pending = pendingLinks.get(code);
    if (!pending) return null;
    if (pending.expiresAtMs < Date.now()) {
      pendingLinks.delete(code);
      return null;
    }
    pendingLinks.delete(code);
    return pending;
  }

  static async handleLinkCommand(
    telegramUserId: number,
    chatId: number,
    text: string,
    telegramUsername?: string
  ) {
    const attemptKey = `link:${telegramUserId}`;
    const attempts = linkAttempts.get(attemptKey) || { count: 0, lastAttempt: 0 };

    // Block if more than 5 attempts in 30 minutes
    if (attempts.count >= 5 && Date.now() - attempts.lastAttempt < 30 * 60 * 1000) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'អ្នកបានព្យាយាមច្រើនដងពេកហើយ។\nសូមរង់ចាំ ៣០ នាទីទៀត ទើបអាចព្យាយាមម្ដងទៀតបានបាទ។',
        'Markdown'
      );
    }

    const parts = text.trim().split(/\s+/);
    const code = parts[1];
    if (!code) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'Usage: /link ADM-XXXXXX',
        'Markdown'
      );
    }

    const pending = this.consumeLinkCode(code);
    if (!pending) {
      // Record failed attempt
      attempts.count += 1;
      attempts.lastAttempt = Date.now();
      linkAttempts.set(attemptKey, attempts);

      return TelegramService.sendMessageByChatId(
        chatId,
        'កូដមិនត្រឹមត្រូវ ឬ ផុតកំណត់',
        'Markdown'
      );
    }

    // Reset attempts on success
    linkAttempts.delete(attemptKey);

    if (pending.telegramUserId && pending.telegramUserId !== telegramUserId) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'This link code is not for your Telegram account.',
        'Markdown'
      );
    }

    if (pending.telegramUsername && telegramUsername && pending.telegramUsername !== telegramUsername) {
      return TelegramService.sendMessageByChatId(
        chatId,
        'This link code is not for your Telegram username.',
        'Markdown'
      );
    }

    await TelegramAdminLinksService.linkAdmin({
      userId: pending.adminUserId,
      telegramUserId,
      chatId,
    });

    await auditLogService.createAuditLog({
      action: 'LINK_TELEGRAM_ADMIN',
      userId: pending.adminUserId,
      resource: 'telegram_admin_bot',
      entityId: pending.adminUserId,
      details: {
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername,
      },
    });

    return TelegramService.sendMessageByChatId(
      chatId,
      'Admin linked successfully.',
      'Markdown'
    );
  }

  private static generateLinkCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let raw = '';
    for (let i = 0; i < 6; i++) {
      raw += chars[randomInt(0, chars.length)];
    }
    return `ADM-${raw}`;
  }
}
