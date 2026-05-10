import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../header-gradient-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.tsx',
      output: {
        entryFileNames: 'mesh-gradient.js',
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
});
