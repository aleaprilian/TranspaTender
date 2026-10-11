import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/TranspaTender/' : './',
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    host: true
  }
})
