/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './lib/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07070A', graphite: '#111016', plum: '#16111E', bone: '#F1ECDF', smoke: '#8A8A92', silver: '#D8D6D3', chrome: '#BFC1C5',
        gold: { DEFAULT: '#D4B26A', soft: '#E6C886', deep: '#8C6F36' }, bronze: '#A87842', ruby: '#A02038', desert: '#C68B4A', uv: '#6E5BFF'
      },
      fontFamily: { display: ['Italiana', 'Cormorant Garamond', 'serif'], editorial: ['Cormorant Garamond', 'serif'], sans: ['Manrope', 'system-ui', 'sans-serif'] },
      letterSpacing: { editorial: '0.18em', wider2: '0.22em' }
    }
  },
  plugins: []
};
