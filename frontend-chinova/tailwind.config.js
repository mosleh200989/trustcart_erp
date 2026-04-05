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
        // ── Natural Glowra Brand Palette ──
        // Soft rose-gold and warm neutrals — cosmetics / beauty vibe
        brand: {
          DEFAULT: '#b5838d',     // Dusty rose (primary CTA)
          light: '#d4a5a5',       // Soft pink
          dark: '#8c6070',        // Deep mauve
          bg: '#fdf2f0',          // Blush tint (section backgrounds)
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#faf7f5',       // Warm off-white
          dark: '#2d2226',        // Dark chocolate
        },
        content: {
          DEFAULT: '#2d2226',     // Dark chocolate text
          secondary: '#6b5b60',   // Muted mauve
          muted: '#a89a9e',       // Faded rose
        },
        // Accent / highlight
        gold: {
          DEFAULT: '#c9a96e',
          light: '#e8d5a3',
          dark: '#a38544',
        },
        // Status colors
        primary: '#b5838d',
        secondary: '#c9a96e',
        accent: '#e8b4b8',
        danger: '#e74c3c',
        success: '#27ae60',
        warning: '#f39c12',
        info: '#3498db',
        // Override orange scale so all TrustCart orange-* classes
        // render as dusty-rose / mauve tones for the Glowra brand
        orange: {
          50: '#fdf2f0',
          100: '#fce4e0',
          200: '#f5c4bd',
          300: '#e8a59e',
          400: '#d4a5a5',
          500: '#b5838d',   // Primary CTA — dusty rose
          600: '#8c6070',   // Hover / dark variant
          700: '#6d4a57',
          800: '#53373f',
          900: '#3d2830',
          950: '#2d1c22',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '0.75rem',
        button: '0.5rem',
        badge: '9999px',
      },
    },
  },
  plugins: [],
};
