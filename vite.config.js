import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png', 'mask-icon.svg'],
      manifest: {
        name: 'Gym Routine Tracker',
        short_name: 'Rutina',
        description: 'Mi app de rutina de gimnasio',
        theme_color: '#111214',
        background_color: '#111214',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
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
  ]
});