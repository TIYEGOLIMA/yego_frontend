# 🚀 Guía de Despliegue - Sistema Yego Integral

Esta guía te ayudará a desplegar tanto el **frontend** (React/Vite) como el **backend** (Ticketera) en producción.

## 📋 Requisitos Previos

- **Node.js** 18+ instalado
- **Java** 17+ para el backend
- **PostgreSQL** para la base de datos
- Servidor con **IP estática** o **dominio**

## 🌐 Configuración de Red

### 1. Obtener la IP del Servidor

```bash
# En Windows
ipconfig

# En Linux/MacOS
ifconfig
# o
ip addr show
```

### 2. Configurar Firewall

```bash
# Permitir puertos necesarios
# Puerto 3000 - Frontend en producción
# Puerto 3030 - Backend Ticketera
# Puerto 5432 - PostgreSQL (si está en el mismo servidor)

# Windows Firewall
netsh advfirewall firewall add rule name="Yego Frontend" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Yego Backend" dir=in action=allow protocol=TCP localport=3030

# Linux (ufw)
sudo ufw allow 3000
sudo ufw allow 3030
```

---

## 🎨 FRONTEND - Despliegue

### 1. Preparar Variables de Entorno

Crea un archivo `.env.production`:

```env
# .env.production
VITE_API_URL=http://TU_IP_DEL_SERVIDOR:3030/api
VITE_WS_URL=ws://TU_IP_DEL_SERVIDOR:3030
VITE_SOCKET_URL=http://TU_IP_DEL_SERVIDOR:3030
VITE_APP_NAME=Yego Integral
VITE_APP_VERSION=2.0.0

# Ejemplo con IP real:
# VITE_API_URL=http://192.168.1.100:3030/api
# VITE_WS_URL=ws://192.168.1.100:3030
# VITE_SOCKET_URL=http://192.168.1.100:3030
```

### 2. Actualizar Archivos de Configuración

**Actualizar `microfrontends/agentpanel/utils/constants.ts`:**
```typescript
// Usar variables de entorno en lugar de IPs hardcodeadas
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3030/api'
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3030'
```

**Actualizar `src/services/auth-service.ts`:**
```typescript
// Cambiar la línea 145 para usar variable de entorno
const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3030/api'
const ticketeraResponse = await fetch(`${backendUrl}/auth/logout`, {
```

### 3. Build del Frontend

```bash
# Instalar dependencias
npm install

# Crear build de producción
npm run build

# El build se genera en la carpeta 'dist'
```

### 4. Despliegue con PM2 (Recomendado)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Instalar servidor estático
npm install -g serve

# Crear archivo de configuración PM2
```

## ⚠️ **IMPORTANTE - Dos Sistemas WebSocket**

Este proyecto tiene **dos sistemas separados**:
- **Frontend Principal** (`src/`): Usa **Socket.IO** → Compatible con backend NestJS
- **Microfrontend AgentPanel** (`microfrontends/agentpanel/`): Usa **SockJS/STOMP** → Necesita backend Spring Boot

**Crear `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [
    {
      name: 'yego-frontend',
      script: 'serve',
      args: '-s dist -l 3000',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
}
```

```bash
# Iniciar con PM2
pm2 start ecosystem.config.js

# Ver estado
pm2 status

# Ver logs
pm2 logs yego-frontend

# Guardar configuración para reinicio automático
pm2 save
pm2 startup
```

### 5. Despliegue Manual (Alternativo)

```bash
# Servir archivos estáticos directamente
npx serve -s dist -l 3000

# O con un servidor web como nginx
```

---

## ⚙️ BACKEND - Despliegue (Ticketera)

### 1. Configurar Base de Datos PostgreSQL

```sql
-- Crear base de datos
CREATE DATABASE ticketera;

-- Crear usuario
CREATE USER ticketera_user WITH ENCRYPTED PASSWORD 'tu_password_seguro';

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE ticketera TO ticketera_user;
```

### 2. Configurar Variables de Entorno del Backend

**Crear `application-prod.yml`:**
```yaml
server:
  port: 3030
  
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/ticketera
    username: ticketera_user
    password: tu_password_seguro
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
  
  # Configuración CORS para permitir el frontend
cors:
  allowed-origins:
    - "http://TU_IP_DEL_SERVIDOR:3000"
    - "http://localhost:5174"  # Para desarrollo
  allowed-methods:
    - GET
    - POST
    - PUT
    - DELETE
    - OPTIONS
  allowed-headers: "*"
  allow-credentials: true

# WebSocket CORS
websocket:
  allowed-origins:
    - "http://TU_IP_DEL_SERVIDOR:3000"
    - "http://localhost:5174"

# JWT
jwt:
  secret: tu_jwt_secret_muy_seguro_aqui
  expiration: 86400000  # 24 horas
```

### 3. Build del Backend

```bash
# Si usas Maven
./mvnw clean package -Pprod

# Si usas Gradle
./gradlew build
```

### 4. Despliegue con PM2

**Crear `ecosystem.backend.config.js`:**
```javascript
module.exports = {
  apps: [
    {
      name: 'ticketera-backend',
      script: 'java',
      args: [
        '-jar',
        '-Dspring.profiles.active=prod',
        '-Xmx512m',
        'target/ticketera-backend.jar'
      ],
      cwd: './ruta_al_backend/',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        JAVA_HOME: '/usr/lib/jvm/java-17-openjdk'
      }
    }
  ]
}
```

```bash
# Iniciar backend con PM2
pm2 start ecosystem.backend.config.js

# Ver estado
pm2 status
```

### 5. Despliegue Manual (Alternativo)

```bash
# Ejecutar directamente
java -jar -Dspring.profiles.active=prod target/ticketera-backend.jar

# O como servicio del sistema (systemd en Linux)
```

---

## 🔧 Configuración de Nginx (Opcional)

Si quieres usar un dominio o proxy reverso:

**`/etc/nginx/sites-available/yego`:**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/yego /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ Lista de Verificación de Despliegue

### Frontend
- [ ] Variables de entorno configuradas con IP del servidor
- [ ] Build generado correctamente (`npm run build`)
- [ ] Servidor web funcionando en puerto 3000
- [ ] Acceso desde la red local/internet

### Backend
- [ ] Base de datos PostgreSQL configurada
- [ ] Variables de entorno de producción
- [ ] CORS configurado para permitir el frontend
- [ ] JAR generado y ejecutándose en puerto 3030
- [ ] WebSocket funcionando

### Red
- [ ] Firewall configurado para puertos 3000 y 3030
- [ ] IP estática asignada o dominio configurado
- [ ] Conexión entre frontend y backend funcionando

---

## 🚨 Solución de Problemas

### Error de CORS
```bash
# Verificar que el backend tenga configurado CORS para la IP del frontend
# En application-prod.yml, agregar:
cors:
  allowed-origins:
    - "http://TU_IP_FRONTEND:3000"
```

### Error de WebSocket
```bash
# Verificar que SockJS esté configurado correctamente
# Y que el firewall permita conexiones WebSocket
```

### Error de Base de Datos
```bash
# Verificar conexión a PostgreSQL
psql -h localhost -U ticketera_user -d ticketera
```

---

## 📞 Comandos Útiles de Monitoreo

```bash
# Ver procesos
pm2 status

# Ver logs
pm2 logs

# Reiniciar servicios
pm2 restart all

# Parar servicios
pm2 stop all

# Ver uso de recursos
pm2 monit
```

---

## 🔄 Script de Despliegue Automatizado

**`deploy.sh`:**
```bash
#!/bin/bash

echo "🚀 Iniciando despliegue de Yego Integral..."

# Frontend
echo "📦 Building frontend..."
npm install
npm run build

echo "🌐 Desplegando frontend..."
pm2 restart yego-frontend || pm2 start ecosystem.config.js

# Backend (si está en el mismo servidor)
echo "⚙️ Desplegando backend..."
cd ../ticketera-backend
./mvnw clean package -Pprod
pm2 restart ticketera-backend

echo "✅ Despliegue completado!"
echo "🌐 Frontend: http://TU_IP:3000"
echo "⚙️ Backend: http://TU_IP:3030"
```

```bash
# Hacer ejecutable y correr
chmod +x deploy.sh
./deploy.sh
```

---

¿Necesitas ayuda con algún paso específico del despliegue?
