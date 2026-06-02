/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // System background (iOS gray)
        bg: '#F2F2F7',
        surface: '#FFFFFF',
        'surface-subtle': '#F9F9F9',
        'surface-muted': '#F2F2F7',

        // Accent — near black (DentWay)
        accent: {
          DEFAULT: '#1C1C1E',
          dark: '#000000',
          light: '#E8E8EA',
          subtle: '#F5F5F5',
        },

        // Action blue (links, navigation)
        blue: { DEFAULT: '#007AFF', light: '#E5F2FF' },

        // Semantic
        success: { DEFAULT: '#34C759', light: '#DCFCE7', border: '#86EFAC' },
        warning: { DEFAULT: '#FF9F0A', light: '#FFF3CD', border: '#FFD60A' },
        error: { DEFAULT: '#FF3B30', light: '#FFF1F0', border: '#FF6B60' },
        info: { DEFAULT: '#32ADE6', light: '#E0F4FF', border: '#67E8F9' },

        // Text
        text: {
          primary: '#1C1C1E',
          secondary: '#6E6E73',
          disabled: '#AEAEB2',
          inverse: '#FFFFFF',
          link: '#007AFF',
        },

        // Borders
        border: '#D1D1D6',
        divider: '#E5E5EA',

        // Legacy backward-compat aliases (so existing pages don't break)
        primary: {
          DEFAULT: '#1C1C1E',
          dark: '#000000',
          light: '#636366',
          surface: '#E8E8EA',
          subtle: '#F5F5F5',
        },
        amber: {
          DEFAULT: '#FF9F0A',
          dark: '#CC7A00',
          light: '#FFF3CD',
          border: '#FFD60A',
        },
        app: {
          bg: '#F2F2F7',
          surface: '#FFFFFF',
          'surface-variant': '#F9F9F9',
          border: '#D1D1D6',
          divider: '#E5E5EA',
          'dark-bg': '#0A0E1A',
        },
        recording: '#FF3B30',
        'info-light': '#E0F4FF',
        'info-border': '#67E8F9',
        'warning-light': '#FFF3CD',
        'warning-border': '#FFD60A',
        'error-light': '#FFF1F0',
        'error-border': '#FF6B60',
        'success-light': '#DCFCE7',
        'success-border': '#86EFAC',
        'amber-light': '#FFF3CD',
        'amber-border': '#FFD60A',
        'amber-dark': '#CC7A00',
        'accent-light': '#E8E8EA',
        'accent-subtle': '#F5F5F5',
        'primary-surface': '#E8E8EA',
        'primary-light': '#636366',
        'blue-light': '#E5F2FF',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'system-ui', 'sans-serif'],
        inter: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'xs': '6px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '28px',
        'full': '9999px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)',
        'elevated': '0 4px 12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)',
        'nav': '0 -1px 0 rgba(0,0,0,0.10)',
        'primary': '0 4px 12px rgba(0,0,0,0.20)',
        'primary-sm': '0 2px 6px rgba(0,0,0,0.15)',
        'sheet': '0 -4px 24px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
