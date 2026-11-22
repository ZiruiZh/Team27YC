import react from '@vitejs/plugin-react'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // ELEVENLABS_API_KEY lives in app/.env.local (git-ignored). It stays on the dev
  // server: the browser calls /api/tts and the proxy adds the key, so it is never bundled.
  const env = loadEnv(mode, dirname(fileURLToPath(import.meta.url)), '')
  const key = env.ELEVENLABS_API_KEY

  return {
    plugins: [react()],
    define: {
      __ELEVEN_TTS__: JSON.stringify(Boolean(key)),
    },
    server: key
      ? {
          proxy: {
            '/api/tts': {
              target: 'https://api.elevenlabs.io',
              changeOrigin: true,
              rewrite: (p) => p.replace(/^\/api\/tts/, '/v1/text-to-speech'),
              headers: { 'xi-api-key': key },
            },
          },
        }
      : undefined,
  }
})
