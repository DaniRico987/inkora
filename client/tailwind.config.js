/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        border: 'var(--color-border)',
        primary: 'var(--color-primary)',
        skyblue: 'var(--color-skyblue)',
        babyblue: 'var(--color-babyblue)',
        gold: 'var(--color-gold)',
      },
    },
  },
  plugins: [],
  //darkMode: 'class',
};
