export type TelegramAdminCallbackResult = {
  text: string;
  replyMarkup?: Record<string, unknown>;
  parseMode?: 'Markdown' | 'HTML';
};
