/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0A0A0B',
          1: '#111113',
          2: '#1A1A1D',
          3: '#232326',
          4: '#2C2C30',
        },
        cream: {
          50: '#FAFAF7',
          100: '#F5F0EB',
          200: '#E8E0D8',
          300: '#C4B8AC',
          400: '#9E9088',
        },
        accent: {
          DEFAULT: '#34D399',
          dim: '#059669',
          glow: 'rgba(52, 211, 153, 0.12)',
        },
        warn: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
