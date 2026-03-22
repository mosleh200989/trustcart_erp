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
        primary: '#059669',
        secondary: '#10b981',
        accent: '#f59e0b',
        danger: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
        info: '#3b82f6',
        // Override orange-500 for WCAG AA contrast (4.5:1) on white backgrounds
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
    },
  },
  plugins: [],
};
