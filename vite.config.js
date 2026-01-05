import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.manus.computer',
      '5173-id4kesrxja0joskm8rhxn-4c744984.sg1.manus.computer'
    ],
  },
});
