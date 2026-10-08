import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Relative base plus HashRouter lets the same build run locally and on
// GitHub Pages under /rental-desk/.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
});
