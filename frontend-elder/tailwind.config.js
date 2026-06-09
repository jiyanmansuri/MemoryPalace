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
        elder: {
          saffron: '#4F46E5',  // Mapped to Family Indigo Primary
          peach: '#818CF8',    // Mapped to Family Light Indigo
          cream: '#F9FAFB',    // Mapped to Family Background
          green: '#10B981',    // Emerald for success states
          brown: '#111827',    // Mapped to Family Text (Dark Gray)
          glass: 'rgba(255, 255, 255, 0.6)',
          glassDark: 'rgba(255, 255, 255, 0.8)',
        }
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 179, 71, 0.7)' },
          '50%': { opacity: .8, transform: 'scale(1.05)', boxShadow: '0 0 20px 10px rgba(255, 179, 71, 0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
