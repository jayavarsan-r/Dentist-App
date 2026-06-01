/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── BACKGROUNDS ──
        bg: '#FFFFFF',
        surface: '#FFFFFF',
        'surface-subtle': '#FAFAF8',
        'surface-muted': '#F4F3F0',

        // ── ACCENT — Sage Green (primary brand) ──
        accent: {
          DEFAULT: '#5F7A61',
          dark: '#49614B',
          light: '#EDF4EE',
          subtle: '#F4F8F4',
        },

        // ── HIGHLIGHT — Amber (pending / upcoming / attention) ──
        amber: {
          DEFAULT: '#D97706',
          dark: '#B45309',
          light: '#FEF3C7',
          border: '#FDE68A',
        },

        // ── SEMANTIC ──
        success: { DEFAULT: '#16A34A', light: '#DCFCE7', border: '#86EFAC' },
        warning: { DEFAULT: '#CA8A04', light: '#FEF9C3', border: '#FDE047' },
        error: { DEFAULT: '#DC2626', light: '#FEE2E2', border: '#FCA5A5' },
        info: { DEFAULT: '#0891B2', light: '#E0F2FE', border: '#67E8F9' },

        // ── TEXT ──
        text: {
          primary: '#1C1917',
          secondary: '#78716C',
          disabled: '#A8A29E',
          inverse: '#FFFFFF',
          link: '#5F7A61',
        },

        // ── BORDERS ──
        border: '#E7E5E4',
        divider: '#F5F5F4',

        // ── BACKWARD-COMPAT ALIASES ──
        // Legacy tokens used by zero-touch pages (login, settings, voice, etc.).
        // Remapped onto the warm palette so those screens re-theme automatically
        // without being modified, per the spec's "no zero-touch file changes" rule.
        primary: {
          DEFAULT: '#5F7A61',
          dark: '#49614B',
          light: '#7A957C',
          surface: '#EDF4EE',
          subtle: '#F4F8F4',
        },
        app: {
          bg: '#FFFFFF',
          surface: '#FFFFFF',
          'surface-variant': '#FAFAF8',
          border: '#E7E5E4',
          divider: '#F5F5F4',
          'dark-bg': '#0A0E1A',
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
        'primary': '0 6px 16px rgba(95,122,97,0.25)',
        'primary-sm': '0 3px 8px rgba(95,122,97,0.19)',
        'nav': '0 -2px 16px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
