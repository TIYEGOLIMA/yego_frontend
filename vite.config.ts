import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"
import { execSync } from "child_process"

function getGitHash() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return Date.now().toString(36)
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, 
    host: true,
    proxy: {
      // Usar '/api/' (con barra) para NO capturar la ruta SPA '/api-logs' (empieza por '/api' pero no es API)
      '/api/': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "microfrontends": resolve(__dirname, "microfrontends"),
    },
  },
  define: {
    global: 'globalThis',
    __APP_VERSION__: JSON.stringify(getGitHash()),
  },
  build: {
    // Aumentar el límite de warning de chunk para evitar warnings innecesarios
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Chunking manual para mejor organización
        manualChunks: {
          // Vendor libraries separadas
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['lucide-react'],
          // Servicios principales separados
          'services': ['axios'],
          // Zustand store separado
          'store': ['zustand']
        }
      }
    }
  }
})