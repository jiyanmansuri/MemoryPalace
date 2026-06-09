/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        family: {
          bg: '#F9FAFB',
          card: '#FFFFFF',
          saffron: '#F5C842',
          primary: '#4F46E5', // Indigo for premium tech feel
          text: '#111827',
          muted: '#6B7280'
        }
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 20px rgba(79, 70, 229, 0.15)',
      }
    },
  },
  plugins: [],
}
