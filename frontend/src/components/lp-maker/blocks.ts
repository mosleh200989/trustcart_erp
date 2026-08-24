// LP Maker block registry.
// A builder page is an ordered list of Block objects stored in
// landing_pages.builder_blocks (template = 'builder').
// Each block type declares its default props and a field schema that
// drives the settings panel — adding a new block type needs no panel code.

export interface Block {
  id: string;
  type: string;
  props: Record<string, any>;
}

// ─── Field schema (drives the settings panel) ────────────────

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'color'
  | 'select'
  | 'toggle'
  | 'image'      // url input + upload button
  | 'items'         // list of {icon, text}
  | 'images'        // list of image urls
  | 'products'      // list of products picked from inventory
  | 'testimonials'  // list of reviews, manual or copied from the library
  | 'datetime';

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[]; // for select
  min?: number;
  max?: number;
  placeholder?: string;
  showIf?: (props: Record<string, any>) => boolean;
}

export interface BlockDef {
  type: string;
  label: string;
  icon: string; // emoji shown in the palette
  description: string;
  defaults: Record<string, any>;
  fields: Field[];
}

export interface BuilderProduct {
  id: string;
  product_id: number;
  name: string;
  image_url?: string;
  price: number;
  compare_price?: number;
  is_default?: boolean;
}

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

// ─── Registry ────────────────────────────────────────────────

export const BLOCK_DEFS: BlockDef[] = [
  {
    type: 'hero',
    label: 'Hero',
    icon: '🏔️',
    description: 'Big banner with headline and call-to-action',
    defaults: {
      title: 'আপনার পণ্যের নাম',
      subtitle: 'কেন এই পণ্যটি আপনার দরকার — এক লাইনে বলুন',
      background_image: '',
      background_color: '#1a1a2e',
      overlay_opacity: 45,
      text_color: '#ffffff',
      button_text: 'অর্ডার করুন',
      button_bg: '#16a34a',
      button_color: '#ffffff',
      height: 'medium',
      align: 'center',
    },
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'background_image', label: 'Background image', type: 'image' },
      { key: 'background_color', label: 'Background color', type: 'color' },
      { key: 'overlay_opacity', label: 'Image overlay %', type: 'number', min: 0, max: 90, showIf: (p) => !!p.background_image },
      { key: 'text_color', label: 'Text color', type: 'color' },
      { key: 'button_text', label: 'Button text (empty = no button)', type: 'text' },
      { key: 'button_bg', label: 'Button background', type: 'color', showIf: (p) => !!p.button_text },
      { key: 'button_color', label: 'Button text color', type: 'color', showIf: (p) => !!p.button_text },
      {
        key: 'height', label: 'Height', type: 'select',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
      },
      { key: 'align', label: 'Alignment', type: 'select', options: ALIGN_OPTIONS },
    ],
  },
  {
    type: 'heading',
    label: 'Heading',
    icon: '🅷',
    description: 'Section title',
    defaults: { text: 'সেকশন শিরোনাম', size: 'lg', align: 'center', color: '#111827' },
    fields: [
      { key: 'text', label: 'Text', type: 'text' },
      {
        key: 'size', label: 'Size', type: 'select',
        options: [
          { value: 'sm', label: 'Small' },
          { value: 'md', label: 'Medium' },
          { value: 'lg', label: 'Large' },
          { value: 'xl', label: 'Extra large' },
        ],
      },
      { key: 'align', label: 'Alignment', type: 'select', options: ALIGN_OPTIONS },
      { key: 'color', label: 'Color', type: 'color' },
    ],
  },
  {
    type: 'text',
    label: 'Text',
    icon: '📝',
    description: 'Paragraph of text',
    defaults: { text: 'আপনার লেখা এখানে লিখুন…', size: 'md', align: 'left', color: '#374151' },
    fields: [
      { key: 'text', label: 'Text', type: 'textarea' },
      {
        key: 'size', label: 'Size', type: 'select',
        options: [
          { value: 'sm', label: 'Small' },
          { value: 'md', label: 'Medium' },
          { value: 'lg', label: 'Large' },
        ],
      },
      { key: 'align', label: 'Alignment', type: 'select', options: ALIGN_OPTIONS },
      { key: 'color', label: 'Color', type: 'color' },
    ],
  },
  {
    type: 'image',
    label: 'Image',
    icon: '🖼️',
    description: 'Single image',
    defaults: { url: '', alt: '', width: 100, radius: 12, align: 'center' },
    fields: [
      { key: 'url', label: 'Image', type: 'image' },
      { key: 'alt', label: 'Alt text', type: 'text' },
      { key: 'width', label: 'Width %', type: 'number', min: 10, max: 100 },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 40 },
      { key: 'align', label: 'Alignment', type: 'select', options: ALIGN_OPTIONS },
    ],
  },
  {
    type: 'gallery',
    label: 'Gallery',
    icon: '🎞️',
    description: 'Grid of images',
    defaults: { images: [], columns: 3, radius: 12 },
    fields: [
      { key: 'images', label: 'Images', type: 'images' },
      { key: 'columns', label: 'Columns', type: 'number', min: 1, max: 4 },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 40 },
    ],
  },
  {
    type: 'video',
    label: 'Video',
    icon: '▶️',
    description: 'YouTube video embed',
    defaults: { url: '', radius: 12 },
    fields: [
      { key: 'url', label: 'YouTube URL', type: 'text', placeholder: 'https://www.youtube.com/watch?v=…' },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 40 },
    ],
  },
  {
    type: 'button',
    label: 'Button',
    icon: '🔘',
    description: 'Call-to-action button',
    defaults: {
      text: 'অর্ডার করুন',
      action: 'order-form',
      url: '',
      bg: '#16a34a',
      color: '#ffffff',
      radius: 12,
      size: 'md',
      align: 'center',
      full_width: false,
    },
    fields: [
      { key: 'text', label: 'Text', type: 'text' },
      {
        key: 'action', label: 'On click', type: 'select',
        options: [
          { value: 'order-form', label: 'Scroll to order form' },
          { value: 'url', label: 'Open a link' },
        ],
      },
      { key: 'url', label: 'Link URL', type: 'text', showIf: (p) => p.action === 'url' },
      { key: 'bg', label: 'Background', type: 'color' },
      { key: 'color', label: 'Text color', type: 'color' },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 40 },
      {
        key: 'size', label: 'Size', type: 'select',
        options: [
          { value: 'sm', label: 'Small' },
          { value: 'md', label: 'Medium' },
          { value: 'lg', label: 'Large' },
        ],
      },
      { key: 'align', label: 'Alignment', type: 'select', options: ALIGN_OPTIONS },
      { key: 'full_width', label: 'Full width', type: 'toggle' },
    ],
  },
  {
    type: 'benefits',
    label: 'Benefits',
    icon: '✅',
    description: 'List of selling points with icons',
    defaults: {
      items: [
        { icon: '✅', text: '১০০% অরিজিনাল পণ্য' },
        { icon: '🚚', text: 'সারাদেশে ক্যাশ অন ডেলিভারি' },
        { icon: '💬', text: 'ফোনে অর্ডার কনফার্ম করা হয়' },
      ],
      columns: 1,
      background: '#f0fdf4',
      color: '#166534',
      radius: 12,
    },
    fields: [
      { key: 'items', label: 'Items', type: 'items' },
      { key: 'columns', label: 'Columns', type: 'number', min: 1, max: 3 },
      { key: 'background', label: 'Background', type: 'color' },
      { key: 'color', label: 'Text color', type: 'color' },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 40 },
    ],
  },
  {
    type: 'testimonials',
    label: 'Reviews',
    icon: '⭐',
    description: 'Customer testimonials with photos and star ratings',
    defaults: {
      heading: 'ক্রেতারা যা বলছেন',
      items: [],
      columns: 2,
      background: '#f9fafb',
      card_background: '#ffffff',
      text_color: '#374151',
      star_color: '#f59e0b',
      radius: 12,
    },
    fields: [
      { key: 'heading', label: 'Heading (empty = none)', type: 'text' },
      { key: 'items', label: 'Reviews', type: 'testimonials' },
      { key: 'columns', label: 'Columns', type: 'number', min: 1, max: 3 },
      { key: 'background', label: 'Section background', type: 'color' },
      { key: 'card_background', label: 'Card background', type: 'color' },
      { key: 'text_color', label: 'Text color', type: 'color' },
      { key: 'star_color', label: 'Star color', type: 'color' },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 40 },
    ],
  },
  {
    type: 'countdown',
    label: 'Countdown',
    icon: '⏳',
    description: 'Deadline timer for offers',
    defaults: {
      label: 'অফার শেষ হতে বাকি',
      ends_at: '',
      background: '#7f1d1d',
      color: '#ffffff',
    },
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'ends_at', label: 'Ends at', type: 'datetime' },
      { key: 'background', label: 'Background', type: 'color' },
      { key: 'color', label: 'Text color', type: 'color' },
    ],
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: '➖',
    description: 'Horizontal line',
    defaults: { color: '#e5e7eb', thickness: 1, width: 100 },
    fields: [
      { key: 'color', label: 'Color', type: 'color' },
      { key: 'thickness', label: 'Thickness px', type: 'number', min: 1, max: 10 },
      { key: 'width', label: 'Width %', type: 'number', min: 10, max: 100 },
    ],
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: '↕️',
    description: 'Empty vertical space',
    defaults: { height: 40 },
    fields: [{ key: 'height', label: 'Height px', type: 'number', min: 8, max: 240 }],
  },
  {
    type: 'html',
    label: 'Custom HTML',
    icon: '🧩',
    description: 'Raw HTML for anything else',
    defaults: { html: '<!-- আপনার HTML এখানে -->' },
    fields: [{ key: 'html', label: 'HTML', type: 'textarea' }],
  },
  {
    type: 'order-form',
    label: 'Order Form',
    icon: '🛒',
    description: 'Products + checkout form (the conversion block)',
    defaults: {
      heading: 'অর্ডার করতে ফর্মটি পূরণ করুন',
      products: [],
      button_text: 'অর্ডার কনফার্ম করুন',
      background: '#ffffff',
      card_background: '#f9fafb',
      accent: '#16a34a',
      text_color: '#1f2937',
      button_bg: '#16a34a',
      button_color: '#ffffff',
      radius: 14,
      show_quantity: true,
    },
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'products', label: 'Products (from inventory)', type: 'products' },
      { key: 'show_quantity', label: 'Quantity selector', type: 'toggle' },
      { key: 'button_text', label: 'Button text', type: 'text' },
      { key: 'background', label: 'Section background', type: 'color' },
      { key: 'card_background', label: 'Card background', type: 'color' },
      { key: 'text_color', label: 'Text color', type: 'color' },
      { key: 'accent', label: 'Accent color', type: 'color' },
      { key: 'button_bg', label: 'Button background', type: 'color' },
      { key: 'button_color', label: 'Button text color', type: 'color' },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 40 },
    ],
  },
];

export const BLOCK_MAP: Record<string, BlockDef> = Object.fromEntries(
  BLOCK_DEFS.map((d) => [d.type, d]),
);

export function newBlock(type: string): Block {
  const def = BLOCK_MAP[type];
  return {
    id: `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    // Deep clone so list defaults (items/images/products) are not shared
    props: JSON.parse(JSON.stringify(def?.defaults || {})),
  };
}

/** Starter layout for a fresh builder page. */
export function starterBlocks(): Block[] {
  return ['hero', 'benefits', 'text', 'order-form'].map(newBlock);
}

export function extractYouTubeId(url: string): string | null {
  const m = String(url || '').match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/,
  );
  return m ? m[1] : null;
}
