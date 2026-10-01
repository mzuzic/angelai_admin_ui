import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Docker on Windows bind mounts doesn't emit file events; set in docker-compose.dev.yml
    watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === 'true' },
  },
})
