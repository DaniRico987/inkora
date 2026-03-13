/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        Primary: '#274c77',
        skyblue: '#6096BA',
        babyblue: '#A3CEF1',
        metallicgold: '#8b8c89',
      },
    },
  },
  plugins: [],
  //darkMode: 'class',
};
