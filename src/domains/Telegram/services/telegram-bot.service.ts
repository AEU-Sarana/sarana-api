import axios from 'axios';
import { TelegramAPIError, TelegramBotInfo, TelegramMessageResponse } from '@src/domains/Telegram/types/telegram.types';

export class TelegramBotService {
  private static readonly BASE_URL = 'https://api.telegram.org/bot';
  
  /**
   * Send message to Telegram
   */
  static async sendMessage(
    botToken: string,
    chatId: string,
    text: string,
    parseMode: 'Markdown' | 'HTML' = 'Markdown'
  ): Promise<TelegramMessageResponse> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: text,
          parse_mode: parseMode
        },
        {
          timeout: 10000 // 10 seconds timeout
        }
      );
      
      return {
        success: true,
        messageId: response.data.result.message_id,
        sentAt: new Date(response.data.result.date * 1000)
      };
    } catch (error: any) {
      if (error.response) {
        throw new TelegramAPIError(
          error.response.data.error_code,
          error.response.data.description
        );
      }
      throw new TelegramAPIError(0, error.message);
    }
  }
  
  /**
   * Test bot token validity
   */
  static async getMe(botToken: string): Promise<TelegramBotInfo> {
    const response = await axios.get(`${this.BASE_URL}${botToken}/getMe`);
    return response.data.result;
  }
}