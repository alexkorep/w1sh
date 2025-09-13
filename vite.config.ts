/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Use a different base path when building for GitHub Pages
  base: mode === 'production' ? '/w1sh/' : '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
}))
