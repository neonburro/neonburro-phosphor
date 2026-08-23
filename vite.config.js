// vite.config.js
//
// The burrow's build. One entry, React, nothing clever. Vendors are split so the
// door loads fast on a phone in a parking lot with one bar: react, chakra and
// supabase each get their own chunk and the door page imports none of the room.
//
// No oxford commas, no em dashes.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@chakra-ui/react', '@emotion/react', '@emotion/styled', 'framer-motion'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
