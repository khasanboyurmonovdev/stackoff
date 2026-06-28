import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true, // expose on the LAN so a phone can reach it by the machine's IP
    strictPort: true, // fail loudly if 5173 is taken instead of silently moving ports
    proxy: {
      // The phone can't resolve the server's "localhost", so the client uses
      // relative /api and /audio paths and Vite proxies them to the API.
      '/api': 'http://localhost:4000',
      '/audio': 'http://localhost:4000',
    },
  },
});
