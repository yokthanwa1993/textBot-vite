import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    server: {
      port: parseInt(env.VITE_SERVER_PORT) || 3000,
      strictPort: true, // ไม่ให้เปลี่ยน port อัตโนมัติ
      cors: true,
      allowedHosts: env.VITE_ALLOWED_HOSTS ? env.VITE_ALLOWED_HOSTS.split(',') : ['localhost', '127.0.0.1'],
      hmr: true, // เปิด hot module replacement
      watch: {
        usePolling: true // ใช้ polling สำหรับการ watch
      }
    }
  }
}) 