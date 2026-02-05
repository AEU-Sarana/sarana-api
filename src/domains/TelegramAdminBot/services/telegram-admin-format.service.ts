export class TelegramAdminFormatService {
  static escapeMarkdown(text: string): string {
    return text.replace(/([_*[\]()`])/g, '\\$1');
  }

  static isValidDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  static buildCustomRangePrompt(
    command: 'report' | 'top' | 'slow' | 'income'
  ) {
    const examples = {
      report: '/report 2026-01-30 2026-02-04',
      top: '/top 2026-01-30 2026-02-04',
      slow: '/slow 2026-01-30 2026-02-04',
      income: '/income 2026-01-30 2026-02-04',
    };
    return `សូមបញ្ចូល ថ្ងៃចាប់ផ្តើម និង បញ្ចប់ Ex: ${examples[command]}`;
  }
}
