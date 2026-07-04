import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#070a10',
          panel: '#0d1320',
          panel2: '#111a2b',
          line: '#25324a',
          mint: '#47f3c2',
          cyan: '#3dcdf7',
          amber: '#f2a93b',
          red: '#f45b69',
          text: '#e8edf5',
          muted: '#8b96ab',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(61,205,247,0.15), 0 18px 48px rgba(0,0,0,0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
