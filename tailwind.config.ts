import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#ebf1f6',
        panel: 'rgba(255, 255, 255, 0.72)',
        stroke: 'rgba(15, 23, 42, 0.1)',
        gold: '#d4af37',
        silver: '#b2becd',
        bronze: '#b07d62'
      },
      boxShadow: {
        glass: '0 10px 35px rgba(15, 23, 42, 0.14)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
};

export default config;
