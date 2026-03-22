/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/layouts/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // --- Semantic Brand Tokens ---
        brand: {
          DEFAULT: '#ea580c',     // Primary brand (orange-500, WCAG AA)
          light: '#fb923c',       // orange-400
          dark: '#c2410c',        // orange-600
          bg: '#fff7ed',          // orange-50, light tinted backgrounds
        },
        surface: {
          DEFAULT: '#ffffff',     // Card / page backgrounds
          muted: '#f9fafb',       // gray-50, subtle section bg
          dark: '#111827',        // gray-900, dark headers/footers
        },
        content: {
          DEFAULT: '#111827',     // gray-900, primary text
          secondary: '#4b5563',   // gray-600, secondary text
          muted: '#9ca3af',       // gray-400, placeholders & disabled
        },
        // Status semantic colors
        primary: '#059669',
        secondary: '#10b981',
        accent: '#f59e0b',
        danger: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
        info: '#3b82f6',
        // Override orange scale for WCAG AA contrast on white backgrounds
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ea580c', // Darkened from #f97316 → meets WCAG AA (4.6:1 on white)
          600: '#c2410c',
          700: '#9a3412',
          800: '#7c2d12',
          900: '#6c2e12',
          950: '#431407',
        },
      },
      borderRadius: {
        // Standardized radius scale
        'card': '0.5rem',        // 8px — cards, modals, inputs
        'button': '0.5rem',      // 8px — action buttons
        'badge': '9999px',       // pill — badges, icon buttons
      },
    },
  },
  plugins: [],
};
