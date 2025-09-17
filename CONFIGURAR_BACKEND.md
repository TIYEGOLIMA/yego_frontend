# 🔧 Configuración Requerida del Backend NestJS

## ⚠️ **IMPORTANTE - CORS Configuration**

Para que el frontend funcione correctamente, necesitas **actualizar el CORS** en tu backend NestJS.

### 📍 **Archivo:** `C:\Users\Giomar\Desktop\yego_backend\src\main.ts`

**Cambiar de:**
```typescript
// CORS configuration
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',  // ← CAMBIAR ESTO
  credentials: true,
});
```

**A:**
```typescript
// CORS configuration
app.enableCors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5174',  // Vite dev server
    'http://localhost:4173',  // Vite preview
    'http://127.0.0.1:5174',  // Alternative localhost
    // Agregar tu IP de producción aquí cuando despligues
  ],
  credentials: true,
});
```

---

### 📍 **Archivo:** `C:\Users\Giomar\Desktop\yego_backend\src\modules\websocket\websocket.gateway.ts`

**Cambiar de:**
```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',  // ← CAMBIAR ESTO
    credentials: true,
  },
})
```

**A:**
```typescript
@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:5174',  // Vite dev server
      'http://localhost:4173',  // Vite preview  
      'http://127.0.0.1:5174',  // Alternative localhost
      // Agregar tu IP de producción aquí cuando despligues
    ],
    credentials: true,
  },
})
```

---

## 🚀 **Pasos para aplicar cambios:**

### **1. Editar los archivos**
Haz los cambios de CORS mencionados arriba

### **2. Reiniciar el backend**
```bash
cd C:\Users\Giomar\Desktop\yego_backend
npm run start:dev
# o
npm run build && npm run start
```

### **3. Verificar que esté corriendo**
Deberías ver:
```
🚀 Server running on http://localhost:3001
📚 Documentation at http://localhost:3001/api/docs
```

---

## ✅ **Verificar conexión:**

### **1. API REST**
Abre: `http://localhost:3001/api/docs` (Swagger)

### **2. WebSocket** 
En el frontend, deberías ver en la consola:
```
🚀 [SocketService] Iniciando conexión Socket.IO...
🌐 [SocketService] URL del servidor: http://localhost:3001
✅ [SocketService] Socket.IO conectado exitosamente a: http://localhost:3001
```

---

## 🌐 **Para Producción:**

### **Variables de entorno en el backend:**
```bash
# Crear .env en el backend
PORT=3001
FRONTEND_URL=http://TU_IP_PRODUCCION:3000
DATABASE_URL=postgresql://...
JWT_SECRET=tu_secret_super_seguro
```

### **CORS para producción:**
Agregar a los arrays de origins:
```typescript
'http://TU_IP_PRODUCCION:3000',
'https://tu-dominio.com',
```

---

## ❓ **Problemas Comunes:**

### **❌ Error: "Access to XMLHttpRequest blocked by CORS"**
- **Solución:** Verificar configuración CORS en main.ts

### **❌ Error: "WebSocket connection failed"**  
- **Solución:** Verificar CORS en websocket.gateway.ts

### **❌ Error: "ERR_CONNECTION_REFUSED"**
- **Solución:** Verificar que el backend esté corriendo en puerto 3001

---

## 🎯 **Configuración Final:**

| Componente | URL | Puerto |
|-----------|-----|--------|
| **Frontend (dev)** | `http://localhost:5174` | 5174 |
| **Frontend (build)** | `http://localhost:3000` | 3000 |
| **Backend NestJS** | `http://localhost:3001` | 3001 |
| **Backend Spring Boot** | `http://10.10.12.117:3030` | 3030 |

¡Una vez que hagas estos cambios, todo debería funcionar perfectamente! 🚀
