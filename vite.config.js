import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const functionsHost = supabaseUrl ? supabaseUrl.replace('.supabase.co', '.functions.supabase.co') : 'https://fqupngafqqclcrjlmklk.functions.supabase.co';
  const aiChatTarget = `${functionsHost}/ai-chat`;

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png', 'mask-icon.svg'],
        manifest: {
          name: 'GymBro',
          short_name: 'GymBro',
          description: 'Mi app de rutina de gimnasio',
          theme_color: '#111214',
          background_color: '#111214',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png'
            },
            {
              src: 'favicon.ico',
              sizes: '48x48',
              type: 'image/x-icon'
            }
          ]
        }
      })
    ],
    server: {
      proxy: {
        '/ai-chat': {
          target: aiChatTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/ai-chat/, '/ai-chat')
        }
      }
    }
  };
});