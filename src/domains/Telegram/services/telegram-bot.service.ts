import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
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
          timeout: 10000
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
   * Send document to Telegram
   */
  static async sendDocument(
    botToken: string,
    chatId: string,
    filePath: string,
    caption?: string
  ): Promise<TelegramMessageResponse> {
    try {
      const form = new FormData();
      form.append('chat_id', chatId);
      if (caption) {
        form.append('caption', caption);
      }
      const isUrl = /^https?:\/\//i.test(filePath);
      const documentSource = isUrl ? filePath : fs.createReadStream(filePath);
      form.append('document', documentSource as any);

      const response = await axios.post(
        `${this.BASE_URL}${botToken}/sendDocument`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 20000,
        }
      );

      return {
        success: true,
        messageId: response.data.result.message_id,
        sentAt: new Date(response.data.result.date * 1000),
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
   * Send photo to Telegram
   */
  static async sendPhoto(
    botToken: string,
    chatId: string,
    photoPathOrBuffer: string | Buffer,
    caption?: string,
    filename: string = 'receipt.jpg'
  ): Promise<TelegramMessageResponse> {
    try {
      const form = new FormData();
      form.append('chat_id', chatId);
      if (caption) {
        form.append('caption', caption);
      }

      const isUrl = typeof photoPathOrBuffer === 'string' && /^https?:\/\//i.test(photoPathOrBuffer);
      const isBuffer = Buffer.isBuffer(photoPathOrBuffer);

      let photo;
      if (isUrl) {
        photo = photoPathOrBuffer;
      } else if (isBuffer) {
        photo = {
          value: photoPathOrBuffer,
          options: { filename, contentType: 'image/jpeg' }
        };
      } else {
        photo = fs.createReadStream(photoPathOrBuffer as string);
      }

      form.append('photo', photo as any);

      const response = await axios.post(
        `${this.BASE_URL}${botToken}/sendPhoto`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 20000,
        }
      );

      return {
        success: true,
        messageId: response.data.result.message_id,
        sentAt: new Date(response.data.result.date * 1000),
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
   * Set webhook for the bot
   */
  static async setWebhook(
    botToken: string,
    url: string,
    secretToken?: string
  ): Promise<boolean> {
    try {
      const response = await axios.post(`${this.BASE_URL}${botToken}/setWebhook`, {
        url,
        secret_token: secretToken,
      });
      return response.data.ok === true;
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
