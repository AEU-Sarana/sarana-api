export type MenuId =
  | 'main'
  | 'report'
  | 'inventory'
  | 'top_products'
  | 'slow_products'
  | 'income'
  | 'export_excel'
  | 'export_sales_rank'
  | 'update_stock';

export interface MenuButton {
  text: string;
  callback_data: string;
}

export interface MenuDefinition {
  title: string;
  buildButtons: () => MenuButton[][];
  parentMenuId?: MenuId;
  showNav?: boolean;
}

export const NAV_MAIN = 'NAV_MAIN';
export const NAV_EXPORT_EXCEL = 'NAV_EXPORT_EXCEL';
export const NAV_EXPORT_SALES_RANK = 'NAV_EXPORT_SALES_RANK';
export const NAV_STOCK_HISTORY = 'NAV_STOCK_HISTORY';
export const NAV_UPDATE_STOCK = 'NAV_UPDATE_STOCK';
export const NAV_UPDATE_STOCK_ADMIN = 'NAV_UPDATE_STOCK_ADMIN';
export const NAV_STOCK_ADJUST = 'NAV_STOCK_ADJUST';

export const NAV_ROW: MenuButton[] = [
  { text: 'ត្រឡប់ក្រោយ', callback_data: 'nav:back' },
  { text: 'មុខម៉ឺនុយ', callback_data: 'nav:home' },
];

const openMenu = (menuId: MenuId) => `nav:open:${menuId}`;
const action = (actionId: string, payload?: string) =>
  payload ? `action:${actionId}:${payload}` : `action:${actionId}`;

export const MENU_DEFS: Record<MenuId, MenuDefinition> = {
  main: {
    title: '🏠សូមជ្រើសរើសមុខងារ៖',
    showNav: false,
    buildButtons: () => [
      [
        { text: '📊របាយការណ៍លក់', callback_data: openMenu('report') },
        { text: '📦របាយការណ៍ស្តុក', callback_data: openMenu('inventory') },
      ],
      [
        { text: '💰របាយការណ៍ចំណូល', callback_data: openMenu('income') },
      ],
      [
        { text: '🔥ទំនិញលក់ដាច់បំផុត', callback_data: openMenu('top_products') },
        { text: '🐢ទំនិញលក់មិនសូវដាច់', callback_data: openMenu('slow_products') },
      ],
      [
        { text: '🔁ផ្ញើរបាយការណ៍ម្តងទៀត', callback_data: action('resend_last_report') },
      ],
      [
        { text: '📦 គ្រប់គ្រោងស្តុក', callback_data: NAV_UPDATE_STOCK_ADMIN },
      ],
      [
        { text: '📤ទាញយកទិន្នន័យជា Excel', callback_data: NAV_EXPORT_EXCEL },
      ],
    ],
  },
  report: {
    title: '📊របាយការណ៍ — ជ្រើសរើសរយៈពេល៖',
    parentMenuId: 'main',
    buildButtons: () => [
      [
        { text: 'របាយការណ៍ថ្ងៃនេះ', callback_data: action('report', 'today') },
        { text: 'របាយការណ៍ម្សិលមិញ', callback_data: action('report', 'yesterday') },
      ],
      [
        { text: 'សប្តាហ៍នេះ', callback_data: action('report', 'this_week') },
        { text: 'ខែនេះ', callback_data: action('report', 'this_month') },
      ],
      [
        { text: 'ឆ្នាំនេះ', callback_data: action('report', 'this_year') },
        { text: 'តាមកាលបរិច្ឆេទ', callback_data: action('report', 'custom') },
      ],
    ],
  },
  inventory: {
    title: '📦 របាយការណ៍ស្តុក — ជ្រើសរបាយការណ៍៖',
    parentMenuId: 'main',
    buildButtons: () => [
      [
        { text: 'ស្តុកនៅសល់', callback_data: action('inventory_on_hand') },
        { text: 'តម្លៃស្តុកសរុប', callback_data: action('inventory_value') },
      ],
      [
        { text: 'ស្តុកទាប', callback_data: action('inventory_low_stock') },
        { text: 'ស្តុកជិតអស់', callback_data: action('inventory_reorder') },
      ],
      [
        { text: '⏳ជិតផុតកំណត់', callback_data: action('inventory_near_expiry') },
      ],
    ],
  },
  top_products: {
    title: '🏆 ទំនិញលក់ដាច់បំផុត — ជ្រើសរើសរយៈពេល៖',
    parentMenuId: 'main',
    buildButtons: () => [
      [
        { text: 'ប្រចាំថ្ងៃ', callback_data: action('top_products', 'today') },
        { text: 'ប្រចាំសប្តាហ៍', callback_data: action('top_products', 'this_week') },
      ],
      [
        { text: 'ប្រចាំខែ', callback_data: action('top_products', 'this_month') },
        { text: 'ប្រចាំឆ្នាំ', callback_data: action('top_products', 'this_year') },
      ],
      [
        { text: 'តាមកាលបរិច្ឆេទ', callback_data: action('top_products', 'custom') },
      ],
    ],
  },
  slow_products: {
    title: '🐢 ទំនិញលក់មិនដាច់ — ជ្រើសរើសរយៈពេល៖',
    parentMenuId: 'main',
    buildButtons: () => [
      [
        { text: 'ប្រចាំសប្តាហ៍', callback_data: action('slow_products', 'this_week') },
        { text: 'ប្រចាំខែ', callback_data: action('slow_products', 'this_month') },
      ],
      [
        { text: 'ប្រចាំឆ្នាំ', callback_data: action('slow_products', 'this_year') },
        { text: 'តាមកាលបរិច្ឆេទ', callback_data: action('slow_products', 'custom') },
      ],
    ],
  },
  income: {
    title: '💰 របាយការណ៍ចំណូល — ជ្រើសរើសរយៈពេល៖',
    parentMenuId: 'main',
    buildButtons: () => [
      [
        { text: 'ប្រចាំថ្ងៃ', callback_data: action('income', 'today') },
        { text: 'ប្រចាំសប្តាហ៍', callback_data: action('income', 'this_week') },
      ],
      [
        { text: 'ប្រចាំខែ', callback_data: action('income', 'this_month') },
        { text: 'ប្រចាំឆ្នាំ', callback_data: action('income', 'this_year') },
      ],
      [
        { text: 'តាមកាលបរិច្ឆេទ', callback_data: action('income', 'custom') },
      ],
    ],
  },
  export_excel: {
    title: '📤 ទាញយកទិន្នន័យជា Excel',
    parentMenuId: 'main',
    buildButtons: () => [
      [
        { text: '📦 ទាញយករបាយការណ៍ស្តុកទាំងអស់', callback_data: 'EXPORT_EXCEL_STOCK_ALL' },
      ],
      [
        { text: '📊 របាយការណ៍ការលក់', callback_data: NAV_EXPORT_SALES_RANK },
      ],
      [
        { text: '📥 ទាញយកប្រវត្តិស្តុក', callback_data: NAV_STOCK_HISTORY },
      ],
      [
        { text: '⬅️ ត្រឡប់ក្រោយ', callback_data: NAV_MAIN },
      ],
    ],
  },
  export_sales_rank: {
    title: '📊 Sales Ranking — ជ្រើសរើសរយៈពេល៖',
    parentMenuId: 'export_excel',
    buildButtons: () => [
      [
        { text: '📅 ថ្ងៃនេះ', callback_data: 'EXPORT_EXCEL_SALES_RANK:today' },
        { text: '📆 សប្តាហ៍នេះ', callback_data: 'EXPORT_EXCEL_SALES_RANK:week' },
      ],
      [
        { text: '🗓 ខែនេះ', callback_data: 'EXPORT_EXCEL_SALES_RANK:month' },
        { text: '📊 ទាំងអស់', callback_data: 'EXPORT_EXCEL_SALES_RANK:all' },
      ],
      [
        { text: '⬅️ ត្រឡប់ក្រោយ', callback_data: NAV_EXPORT_EXCEL },
      ],
    ],
  },
  update_stock: {
    title: '📦 គ្រប់គ្រោងស្តុក',
    parentMenuId: 'main',
    showNav: false,
    buildButtons: () => [
      [
        { text: '📥បន្ថែមស្តុកថ្មី', callback_data: 'STOCK_IN' },
      ],
      [
        { text: '🛠កែប្រែស្តុក', callback_data: NAV_STOCK_ADJUST },
      ],
      [
        { text: '⬅️ ត្រឡប់ក្រោយ', callback_data: NAV_MAIN },
      ],
    ],
  },
};
