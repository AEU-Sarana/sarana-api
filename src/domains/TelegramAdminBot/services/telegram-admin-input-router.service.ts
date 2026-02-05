import {
  getPendingKey,
  pendingIncomeRanges,
  pendingReportRanges,
  pendingSlowProductsRanges,
  pendingTopProductsRanges,
} from './telegram-admin-state.service';
import { TelegramAdminReportService } from './telegram-admin-report.service';

export class TelegramAdminInputRouterService {
  static async handlePendingInput(
    chatId: number,
    text: string | undefined,
    adminUserId: number,
    telegramUserId: number
  ) {
    if (!text) return null;
    const pendingKey = getPendingKey(chatId);

    if (pendingReportRanges.has(pendingKey)) {
      return TelegramAdminReportService.handleReportRangeInput(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId
      );
    }
    if (pendingTopProductsRanges.has(pendingKey)) {
      return TelegramAdminReportService.handleTopProductsRangeInput(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId
      );
    }
    if (pendingSlowProductsRanges.has(pendingKey)) {
      return TelegramAdminReportService.handleSlowProductsRangeInput(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId
      );
    }
    if (pendingIncomeRanges.has(pendingKey)) {
      return TelegramAdminReportService.handleIncomeRangeInput(
        pendingKey,
        chatId,
        text,
        adminUserId,
        telegramUserId
      );
    }

    return null;
  }
}
