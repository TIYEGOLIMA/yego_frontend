# 🏗️ ORGANIZACIÓN DE SERVICIOS POR SISTEMAS

## 📁 ESTRUCTURA PROPUESTA

```
src/services/
├── socket-service.ts           🌐 GLOBAL - WebSocket para TODOS los sistemas
│                               ✅ Compartido por ticketera, OKR, CRM, etc.
│
├── core/                       🏢 SERVICIOS PRINCIPALES DEL SISTEMA
│   ├── api.ts                  → API principal/global
│   ├── auth-service.ts         → Autenticación principal
│   └── microfrontend-service.ts → Gestión de microfrontends
│
├── ticketera/                  🎫 SERVICIOS ESPECÍFICOS DE TICKETERA
│   ├── dashboard-service.ts    → Dashboard de tickets (movido aquí)
│   └── ticket-service.ts       → Servicios específicos de tickets (futuro)
│
├── okr/                        🎯 SERVICIOS ESPECÍFICOS DE OKR (FUTURO)
│   ├── okr-dashboard-service.ts
│   ├── goals-service.ts
│   └── metrics-service.ts
│
└── crm/                        🏪 SERVICIOS ESPECÍFICOS DE CRM (FUTURO)
    ├── crm-dashboard-service.ts
    ├── contacts-service.ts
    └── sales-service.ts
```

## 🔥 VENTAJAS DE ESTA ORGANIZACIÓN:

### ✅ **SEPARACIÓN CLARA:**
- **WebSocket GLOBAL** → Todos los sistemas lo usan
- **Core** → Servicios principales (auth, api, microfrontends)  
- **Por sistema** → Cada sistema tiene su carpeta

### ✅ **ESCALABILIDAD:**
- Agregar OKR → Solo crear carpeta `okr/`
- Agregar CRM → Solo crear carpeta `crm/`
- Sin confusión ni conflictos

### ✅ **MANTENIMIENTO:**
- Desarrolladores de ticketera → Solo trabajan en `ticketera/`
- Desarrolladores de OKR → Solo trabajan en `okr/`
- WebSocket centralizado → Un solo lugar para todos

## 🎯 ARCHIVOS A MOVER:

### MANTENER EN RAÍZ:
- ✅ `socket-service.ts` → **GLOBAL para todos**

### MOVER A `core/`:
- 📁 `api.ts` → API principal
- 📁 `auth-service.ts` → Autenticación principal  
- 📁 `microfrontend-service.ts` → Gestión de microfrontends

### MOVER A `ticketera/`:
- 📁 `dashboard-service.ts` → Es específico de ticketera

## 🚀 RESULTADO FINAL:

```javascript
// ✅ IMPORTS ORGANIZADOS:

// WebSocket global (para todos)
import SocketService from '../services/socket-service';

// Servicios principales
import { api } from '../services/core/api';
import { authService } from '../services/core/auth-service';

// Servicios de ticketera
import { ticketeraDashboard } from '../services/ticketera/dashboard-service';

// Servicios de OKR (futuro)
import { okrDashboard } from '../services/okr/okr-dashboard-service';
```

## ❓ ¿CONTINUAMOS CON ESTA ESTRUCTURA?

¿Te parece bien esta organización? ¿O prefieres algún cambio antes de mover los archivos?
