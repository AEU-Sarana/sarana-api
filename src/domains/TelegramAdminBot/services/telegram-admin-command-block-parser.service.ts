import { logger } from '@src/shared/utils/logger';

const DUPLICATE_WARNING_PREFIX = 'Duplicate key';

export class TelegramAdminCommandBlockParserService {
  static parseCommandBlock(text: string): {
    fields: Record<string, string>;
    warnings: string[];
  } {
    const fields: Record<string, string> = {};
    const warnings: string[] = [];

    // Telegram adds "@botname" automatically when using switch_inline_query_current_chat.
    // Example: "@phumentmart_bot /product_code P001" -> "/product_code P001"
    const sanitized = this.sanitizeInput(text);
    if (sanitized !== text) {
      logger.info('Telegram admin command block sanitized', {
        beforeLength: text.length,
        afterLength: sanitized.length,
      });
    }

    const lines = sanitized.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (!line.startsWith('/')) {
        warnings.push(`Ignored line: ${line}`);
        continue;
      }

      const [rawKey, ...rest] = line.split(/\s+/);
      const key = rawKey.replace(/^\/+/, '').toLowerCase();
      const value = rest.join(' ').trim();

      if (!key) continue;
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        warnings.push(`${DUPLICATE_WARNING_PREFIX}: /${key} (last value used)`);
      }
      fields[key] = value;
    }

    if (fields.product && !fields.product_code) {
      fields.product_code = fields.product;
    }

    return { fields, warnings };
  }

  private static sanitizeInput(text: string): string {
    let sanitized = text;
    // Remove bot mention if it is the first token or first line.
    sanitized = sanitized.replace(/^\s*@\w+\s*\n?/, '');
    sanitized = sanitized.replace(/^\s*@\w+\s+/, '');
    return sanitized.trimStart();
  }
}
