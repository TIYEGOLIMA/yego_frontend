import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, 
    host: true 
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "microfrontends": resolve(__dirname, "microfrontends"),
    },
  },
  define: {
    global: 'globalThis',
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