import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Mostrar información de entorno en desarrollo
if (import.meta.env.DEV) {
  console.log('🚀 Iniciando aplicación en modo desarrollo');
  console.log('📡 API URL:', import.meta.env.VITE_API_URL);
  console.log('🔌 Socket URL:', import.meta.env.VITE_SOCKET_URL);
}

// Aplicar tema inmediatamente antes de que React se monte
(function() {
  const savedTheme = localStorage.getItem('yego-theme');
  const root = document.documentElement;
  
  if (savedTheme === 'dark') {
    root.classList.add('dark');
  } else if (savedTheme === 'light') {
    root.classList.remove('dark');
  } else if (savedTheme === 'system') {
    // Detectar preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)