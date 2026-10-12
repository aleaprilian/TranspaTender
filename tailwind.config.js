/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Keep legacy override used across the app
        slate: {
          950: '#020617',
        },
        // Primary institutional brand accent (navy)
        brand: {
          50: '#f3f6fa',
          100: '#e6ecf3',
          200: '#c9d6e5',
          300: '#a1b5cc',
          400: '#6f8aab',
          500: '#4a6a8f',
          600: '#35506f',
          700: '#293f58',
          800: '#21324a',
          900: '#1b2a3d',
          950: '#0f1a28',
        },
        // Semantic status tones (desaturated). Color = meaning, not decoration.
        status: {
          commit: { bg: '#e8f1fb', text: '#1e5a8a', border: '#bcd8ee', dot: '#2f7cb0' },
          reveal: { bg: '#fdf4e3', text: '#8a5a12', border: '#f0d9a8', dot: '#c98a1f' },
          done: { bg: '#e9f6ef', text: '#186b43', border: '#bce0cc', dot: '#2f8f5f' },
          pending: { bg: '#eef0f6', text: '#3a4a7a', border: '#ccd4e8', dot: '#5a6ba8' },
          danger: { bg: '#fdeff1', text: '#9f1239', border: '#f8ccd5', dot: '#d63b5b' },
        },
      },
      borderRadius: {
        control: '8px',
        card: '12px',
        modal: '16px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px -1px rgba(15, 23, 42, 0.03)',
        popover: '0 8px 24px -6px rgba(15, 23, 42, 0.12), 0 2px 8px -2px rgba(15, 23, 42, 0.06)',
        modal: '0 24px 48px -12px rgba(15, 23, 42, 0.18), 0 8px 16px -8px rgba(15, 23, 42, 0.08)',
      },
      fontSize: {
        '2xs': ['12px', { lineHeight: '16px' }],
        xs: ['13px', { lineHeight: '18px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['15px', { lineHeight: '22px' }],
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
