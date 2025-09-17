@echo off
REM 🚀 Script de Despliegue para Windows - Yego Integral
REM ====================================================

echo 🚀 Iniciando despliegue de Yego Integral...

if "%1"=="" (
    echo ❌ Error: Debes proporcionar la IP del servidor
    echo 📖 Uso: deploy.bat TU_IP_DEL_SERVIDOR
    echo 📖 Ejemplo: deploy.bat 192.168.1.100
    pause
    exit /b 1
)

set SERVER_IP=%1

echo 🌐 Configurando para IP: %SERVER_IP%

REM Crear archivo .env.production
(
echo # Frontend principal (Socket.IO^) - Backend NestJS
echo VITE_API_URL=http://%SERVER_IP%:3001/api/v1
echo VITE_SOCKET_URL=http://%SERVER_IP%:3001
echo VITE_WS_URL=ws://%SERVER_IP%:3001
echo.
echo # Aplicación
echo VITE_APP_NAME=Yego Integral
echo VITE_APP_VERSION=2.0.0
) > .env.production

echo ✅ Archivo .env.production creado

REM Verificar si existen node_modules
if not exist "node_modules" (
    echo 📦 Instalando dependencias...
    npm install
)

REM Build del proyecto
echo 🔨 Construyendo proyecto...
npm run build

if %errorlevel%==0 (
    echo ✅ Build completado exitosamente
    echo 📁 Los archivos están en la carpeta 'dist'
    echo.
    echo 🎯 Próximos pasos:
    echo 1. Instalar PM2: npm install -g pm2 serve
    echo 2. Ejecutar: pm2 start "serve -s dist -l 3000" --name yego-frontend
    echo 3. Verificar: pm2 status
    echo.
    echo 🌐 Tu aplicación estará disponible en:
    echo    http://%SERVER_IP%:3000
    echo.
    pause
) else (
    echo ❌ Error en el build
    pause
    exit /b 1
)
