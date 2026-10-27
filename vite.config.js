import { defineConfig } from 'vite';

const previewApiPort = process.env.W08_PREVIEW_API_PORT ?? '3001';
if (!/^[1-9]\d{0,4}$/.test(previewApiPort) || Number(previewApiPort) > 65_535) {
  throw new Error('W08_PREVIEW_API_PORT must be a valid local TCP port.');
}

const previewCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'none'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
      },
    },
  },
  preview: {
    proxy: {
      '/api': { target: `http://127.0.0.1:${previewApiPort}` },
    },
    headers: {
      'Content-Security-Policy': previewCsp,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  },
});
