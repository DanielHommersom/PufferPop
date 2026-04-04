import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,

    terserOptions: {
      compress: {
        passes: 2,
        drop_console: true,
        drop_debugger: true,
        collapse_vars: true,
        reduce_vars: true,
      },
      mangle: true,
      format: {
        comments: false,
        ascii_only: true,
      },
    },

    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
        chunkFileNames: 'assets/pfr-[hash].js',
        entryFileNames: 'assets/pfr-[hash].js',
        assetFileNames: 'assets/pfr-[hash].[ext]',
      },
    },
  },
});
