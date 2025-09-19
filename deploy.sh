#!/bin/bash

# 🚀 Script de Despliegue Automatizado - Yego Integral
# ====================================================

echo "🚀 Iniciando despliegue de Yego Integral..."

# Verificar si se proporcionó la IP
if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar la IP del servidor"
    echo "📖 Uso: ./deploy.sh TU_IP_DEL_SERVIDOR"
    echo "📖 Ejemplo: ./deploy.sh 192.168.1.100"
    exit 1
fi

SERVER_IP=$1

echo "🌐 Configurando para IP: $SERVER_IP"

# Crear archivo .env.production
cat > .env.production << EOF
# Frontend principal (Backend NestJS)
VITE_API_URL=http://$SERVER_IP/api

# Backend del AgentPanel (Sistema de ticketera)
VITE_AGENT_API_URL=http://$SERVER_IP:3030/api
VITE_AGENT_SOCKET_URL=http://$SERVER_IP:3030

# WebSockets
VITE_SOCKET_URL=http://$SERVER_IP
VITE_WS_URL=ws://$SERVER_IP

# Aplicación  
VITE_APP_NAME=Yego Integral
VITE_APP_VERSION=2.0.0
VITE_DEV_MODE=false
VITE_ENABLE_LOGS=false
VITE_ENABLE_DEBUG=false
EOF

echo "✅ Archivo .env.production creado"

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Build del proyecto
echo "🔨 Construyendo proyecto..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completado exitosamente"
    echo "📁 Los archivos están en la carpeta 'dist'"
    echo ""
    echo "🎯 Próximos pasos:"
    echo "1. Instalar PM2: npm install -g pm2 serve"
    echo "2. Ejecutar: pm2 start 'serve -s dist -l 3000' --name yego-frontend"
    echo "3. Verificar: pm2 status"
    echo ""
    echo "🌐 Tu aplicación estará disponible en:"
    echo "   http://$SERVER_IP:3000"
    echo ""
else
    echo "❌ Error en el build"
    exit 1
fi
