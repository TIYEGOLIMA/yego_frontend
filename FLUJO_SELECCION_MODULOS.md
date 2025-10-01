# 🎯 Flujo de Selección de Módulos

## 🔍 Problema Identificado

Cuando un usuario **OPERADOR** se loguea y **no tiene un módulo asignado** (`moduleId: null`), debe poder **seleccionar entre los módulos activos** disponibles antes de acceder al sistema.

## ✅ Solución Implementada

### **1. Detección Automática**
- ✅ Al hacer login, se verifica si `user.role === 'OPERADOR'` y `user.moduleId === null`
- ✅ Se establece `needsModuleSelection: true` en el store de autenticación
- ✅ Se muestran logs detallados para debugging

### **2. Servicio de Módulos (`moduleService`)**
```typescript
// Obtener módulos activos
await moduleService.getActiveModules()

// Obtener módulos para frontend (con displayName, order, etc.)
await moduleService.getFrontendModules()

// Asignar módulo a usuario
await moduleService.assignModuleToUser(userId, moduleId)

// Liberar módulo de usuario
await moduleService.releaseUserModule(userId)
```

### **3. Componente ModuleSelection**
- ✅ Interfaz moderna y responsive
- ✅ Cards con información de cada módulo
- ✅ Estados de carga y error
- ✅ Asignación automática al seleccionar
- ✅ Actualización del store de usuario

### **4. Integración en App.tsx**
- ✅ Renderizado condicional basado en `needsModuleSelection`
- ✅ Bloquea acceso al sistema hasta seleccionar módulo
- ✅ Redirección automática después de selección

## 🚀 Flujo de Usuario

### **Escenario: Usuario OPERADOR sin módulo**

1. **Login** → Usuario ingresa credenciales
2. **Verificación** → Sistema detecta `moduleId: null`
3. **Selección** → Se muestra pantalla de selección de módulos
4. **Asignación** → Usuario selecciona módulo → Se asigna en backend
5. **Acceso** → Usuario accede al dashboard con módulo asignado

### **Escenario: Usuario OPERADOR con módulo**

1. **Login** → Usuario ingresa credenciales
2. **Verificación** → Sistema detecta `moduleId: 123`
3. **Acceso** → Usuario accede directamente al dashboard

### **Escenario: Usuario SUPERADMIN**

1. **Login** → Usuario ingresa credenciales
2. **Acceso** → Usuario accede directamente (no necesita módulo)

## 🔧 APIs del Backend Utilizadas

### **Obtener Módulos Activos (Agentes en Cola)**
```http
GET /api/ticketera/queue-agents/activos
Authorization: Bearer {token}
```

**Respuesta del Backend:**
```json
[
  {
    "id": 533,
    "userId": 3,
    "moduleId": 1,
    "status": "OCUPADO",
    "isActive": true,
    "createdAt": "2025-09-29T13:54:37.651082",
    "updatedAt": null
  },
  {
    "id": 534,
    "userId": 2,
    "moduleId": 2,
    "status": "OCUPADO",
    "isActive": true,
    "createdAt": "2025-09-29T15:04:01.874341",
    "updatedAt": null
  }
]
```

**Transformación en Frontend:**
- Extrae `moduleId` únicos de la respuesta
- Mapea `moduleId` a nombres descriptivos
- Genera lista de módulos disponibles para selección

### **Asignar Módulo a Usuario**
```http
POST /api/ticketera/queue-agents/asignar
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": 8,
  "moduleId": 1
}
```

### **Liberar Módulo de Usuario**
```http
POST /api/ticketera/queue-agents/liberar
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": 8
}
```

### **Verificar Estado del Módulo de Usuario**
```http
GET /api/ticketera/queue-agents/user/{userId}/status
Authorization: Bearer {token}
```

### **Restaurar Módulo de Usuario**
```http
POST /api/ticketera/queue-agents/user/{userId}/restore
Authorization: Bearer {token}
```

### **Verificar JWT**
```http
GET /api/ticketera/queue-agents/jwt-verify
Authorization: Bearer {token}
```

## 📋 Logs de Debug

### **Login Exitoso con Módulo**
```
🔍 [authStore] Usuario logueado: Victoria Piña
🔍 [authStore] Rol: OPERADOR
🔍 [authStore] ModuleId: 1
🔍 [authStore] Necesita seleccionar módulo: false
```

### **Login Exitoso sin Módulo**
```
🔍 [authStore] Usuario logueado: Victoria Piña
🔍 [authStore] Rol: OPERADOR
🔍 [authStore] ModuleId: null
🔍 [authStore] Necesita seleccionar módulo: true
```

### **Selección de Módulo**
```
🔄 [ModuleSelection] Cargando módulos activos...
✅ [ModuleSelection] Módulos cargados: [...]
🔄 [ModuleSelection] Asignando módulo 1 al usuario 8...
🔄 [moduleService] Asignando módulo 1 al usuario 8...
✅ [moduleService] Módulo asignado exitosamente
🔄 [authStore] Usuario actualizado: Victoria Piña
🔄 [authStore] ModuleId: 1
🔄 [authStore] Necesita seleccionar módulo: false
✅ [App] Módulo 1 seleccionado, redirigiendo al dashboard
```

## 🚨 Manejo de Token Corrupto

### **Problema Identificado**
Si el usuario se loguea con un **token JWT con firma inválida**, no podrá cargar la lista de módulos porque el backend rechaza todas las peticiones con error 401.

### **Solución Implementada**
1. **Detección Automática**: Verifica token antes de cargar módulos
2. **Error Específico**: Muestra mensaje claro sobre sesión inválida
3. **Botón de Logout**: Permite cerrar sesión y limpiar datos
4. **Modo de Emergencia**: Opción para continuar sin módulo

### **Flujo de Recuperación**
```
Token Corrupto → Error 401 → Mensaje de Sesión Inválida → Botón "Cerrar Sesión" → Login Fresh
```

### **Selección Obligatoria**
- ✅ **Es obligatorio** seleccionar un módulo para continuar
- ✅ **No se permite** acceso sin módulo asignado
- ✅ **Interfaz bloquea** hasta que se seleccione un módulo
- ✅ **Mensaje claro** indica que es obligatorio

## 🧪 Testing Manual

### **Caso 1: Usuario sin módulo (Token Válido)**
1. Crear usuario OPERADOR con `moduleId: null`
2. Hacer login con token válido
3. Verificar que aparece pantalla de selección
4. Seleccionar módulo
5. Verificar redirección al dashboard

### **Caso 2: Usuario sin módulo (Token Corrupto)**
1. Crear usuario OPERADOR con `moduleId: null`
2. Hacer login (recibe token corrupto)
3. Verificar mensaje "Sesión Inválida"
4. Hacer click en "Cerrar Sesión"
5. Hacer login nuevamente con token fresco

### **Caso 3: Usuario sin módulo (Token Corrupto)**
1. Usuario con token corrupto
2. Verificar mensaje "Es obligatorio seleccionar un módulo"
3. Hacer click en "Cerrar Sesión" para obtener token fresco

### **Caso 4: Usuario con módulo**
1. Usar usuario OPERADOR con `moduleId: 1`
2. Hacer login
3. Verificar acceso directo al dashboard

### **Caso 5: Usuario SUPERADMIN**
1. Usar usuario SUPERADMIN
2. Hacer login
3. Verificar acceso directo al dashboard

## 🔧 Configuración del Backend Requerida

El backend debe tener estos endpoints configurados:
- ✅ `/api/ticketera/queue-agents/activos` - Obtener agentes activos
- ✅ `/api/ticketera/queue-agents/asignar` - Asignar módulo a usuario
- ✅ `/api/ticketera/queue-agents/liberar` - Liberar módulo de usuario
- ✅ `/api/ticketera/queue-agents/user/{userId}/status` - Verificar estado del módulo
- ✅ `/api/ticketera/queue-agents/user/{userId}/restore` - Restaurar módulo
- ✅ `/api/ticketera/queue-agents/jwt-verify` - Verificar JWT

## 📱 UI/UX

- **Responsive**: Funciona en desktop, tablet y móvil
- **Loading States**: Indicadores de carga durante asignación
- **Error Handling**: Manejo de errores con reintentos
- **Accesibilidad**: Navegación por teclado y screen readers
- **Tema**: Soporte para modo claro y oscuro

---

**Estado**: ✅ Implementado y listo para testing
**Próximo paso**: Probar con usuario real sin módulo asignado
