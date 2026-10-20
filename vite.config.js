import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5184,
    open: false,
    host: true
  },
  preview: {
    port: 5184
  }
});
