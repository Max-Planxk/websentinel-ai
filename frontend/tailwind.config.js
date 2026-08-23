/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        healthy: '#22c55e',
        degraded: '#eab308',
        broken: '#ef4444',
      },
    },
  },
  plugins: [],
};
