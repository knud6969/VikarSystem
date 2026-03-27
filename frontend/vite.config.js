import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth':            'http://localhost:3000',
      '/laerere':         'http://localhost:3000',
      '/vikarer':         'http://localhost:3000',
      '/lektioner':       'http://localhost:3000',
      '/fravaer':         'http://localhost:3000',
      '/tildelinger':     'http://localhost:3000',
      '/tilgaengelighed': 'http://localhost:3000',
      '/beskeder':        'http://localhost:3000',
      '/timer':           'http://localhost:3000',
      '/indstillinger':   'http://localhost:3000',
      '/loenkoersel':     'http://localhost:3000',
      '/notifikationer':  'http://localhost:3000',
      '/klasser':         'http://localhost:3000',
    },
  },
});