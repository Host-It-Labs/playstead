import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');
  const frontendPort = Number(environment.PLAYSTEAD_FRONTEND_PORT || 5174);
  const backendUrl = environment.PLAYSTEAD_BACKEND_URL || 'http://localhost:3005';

  return {
    plugins: [react(), tailwindcss()],
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            map: ['maplibre-gl'],
            realtime: ['socket.io-client', 'zustand'],
            react: ['react', 'react-dom'],
          },
        },
      },
    },
    server: {
      port: frontendPort,
      strictPort: true,
      proxy: {
        '/api': backendUrl,
        '/socket.io': {
          target: backendUrl,
          ws: true,
        },
      },
    },
  };
});
