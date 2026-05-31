/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B70F8',
          dark: '#1355C4',
          light: '#4D8EFF',
          surface: '#EBF3FF',
          subtle: '#F0F7FF',
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
          border: '#86EFAC',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
          border: '#FBBF24',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          border: '#FCA5A5',
        },
        info: {
          DEFAULT: '#0891B2',
          light: '#E0F2FE',
          border: '#67E8F9',
        },
        app: {
          bg: '#F5F7FA',
          surface: '#FFFFFF',
          'surface-variant': '#F8FAFC',
          border: '#E2E8F0',
          divider: '#F1F5F9',
          'dark-bg': '#0A0E1A',
        },
        text: {
          primary: '#0F172A',
          secondary: '#64748B',
          disabled: '#94A3B8',
          inverse: '#FFFFFF',
          link: '#1B70F8',
        },
        recording: '#EF4444',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
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
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.04)',
        'elevated': '0 4px 20px rgba(0,0,0,0.07)',
        'primary': '0 6px 16px rgba(27,112,248,0.25)',
        'primary-sm': '0 3px 8px rgba(27,112,248,0.19)',
        'nav': '0 -2px 16px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
