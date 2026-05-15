/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'rgb(var(--bg-primary) / <alpha-value>)',
        'bg-secondary': 'rgb(var(--bg-secondary) / <alpha-value>)',
        'bg-tertiary': 'rgb(var(--bg-tertiary) / <alpha-value>)',
        'accent': 'rgb(var(--accent) / <alpha-value>)',
        'accent-blue': 'rgb(var(--accent-blue) / <alpha-value>)',
        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'node-bg': 'rgb(var(--node-bg) / <alpha-value>)',
        'node-border': 'rgb(var(--node-border) / <alpha-value>)',
        'node-asset': 'rgb(var(--node-asset) / <alpha-value>)',
        'node-character': 'rgb(var(--node-character) / <alpha-value>)',
        'node-scene': 'rgb(var(--node-scene) / <alpha-value>)',
        'node-prompt': 'rgb(var(--node-prompt) / <alpha-value>)',
        'node-gpt': 'rgb(var(--node-gpt) / <alpha-value>)',
        'node-seedance': 'rgb(var(--node-seedance) / <alpha-value>)',
        'node-comfy': 'rgb(var(--node-comfy) / <alpha-value>)',
        'node-output': 'rgb(var(--node-output) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
