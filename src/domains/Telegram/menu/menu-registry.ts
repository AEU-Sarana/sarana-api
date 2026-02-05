export type MenuId =
  | 'main'
  | 'report'
  | 'inventory'
  | 'top_products'
  | 'slow_products'
  | 'income';

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

export const NAV_ROW: MenuButton[] = [
  { text: 'ត្រឡប់ក្រោយ', callback_data: 'nav:back' },
  { text: 'មុខម៉ឺនុយ', callback_data: 'nav:home' },
];

const openMenu = (menuId: MenuId) => `nav:open:${menuId}`;
const action = (actionId: string, payload?: string) =>
  payload ? `action:${actionId}:${payload}` : `action:${actionId}`;

export const MENU_DEFS: Record<MenuId, MenuDefinition> = {
  main: {
    title: 'Select an action:',
    showNav: false,
    buildButtons: () => [
      [
        { text: '📊 របាយការណ៍', callback_data: openMenu('report') },
        { text: '📦 របាយការណ៍ស្តុក', callback_data: openMenu('inventory') },
      ],
      [
        { text: 'សង្ខេបវេន', callback_data: action('shift_summary') },
        { text: 'របាយការណ៍ចំណូល', callback_data: openMenu('income') },
      ],
      [
        { text: 'ទំនិញលក់ដាច់បំផុត', callback_data: openMenu('top_products') },
        { text: 'ទំនិញលក់មិនដាច់', callback_data: openMenu('slow_products') },
      ],
      [
        { text: 'ផ្ញើរបាយការណ៍ម្តងទៀត', callback_data: action('resend_last_report') },
      ],
    ],
  },
  report: {
    title: '📊 របាយការណ៍ — ជ្រើសរើសរយៈពេល៖',
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
};
