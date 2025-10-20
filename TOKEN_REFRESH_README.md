# 🔑 Sistema de Renovación Automática de Tokens JWT

## 📋 Descripción

Este sistema implementa la renovación automática de tokens JWT para evitar deslogueos inesperados en la aplicación. Incluye soporte tanto para el módulo principal como para el módulo de ticketera.

## 🚀 Endpoints Agregados

### Módulo Principal
- `POST /api/auth/refresh` - Renovar token principal
- `GET /api/auth/verify` - Verificar token principal

### Módulo Ticketera
- `POST /api/ticketera/auth/refresh` - Renovar token ticketera
- `GET /api/ticketera/auth/verify` - Verificar token ticketera

## 🛠️ Servicios Agregados

### AuthService (Principal)
```typescript
// Renovar token
const response = await authService.refreshToken()

// Verificar token
const isValid = await authService.verifyToken()
```

### TicketeraAuthService
```typescript
// Renovar token ticketera
const response = await ticketeraAuthService.refreshToken()

// Verificar token ticketera
const isValid = await ticketeraAuthService.verifyToken()
```

## 🎣 Hooks Disponibles

### useTokenRefresh
```typescript
import { useTokenRefresh } from '../hooks'

// En tu componente
const { refreshToken } = useTokenRefresh(30) // 30 minutos de intervalo
```

### useTicketeraTokenRefresh
```typescript
import { useTicketeraTokenRefresh } from '../hooks'

// En tu componente de ticketera
const { refreshToken } = useTicketeraTokenRefresh(30) // 30 minutos de intervalo
```

## 🧩 Componentes Provider

### TokenRefreshProvider (Principal)
```typescript
import { TokenRefreshProvider } from '../components/TokenRefreshProvider'

// En tu App.tsx
<TokenRefreshProvider intervalMinutes={30}>
  <YourApp />
</TokenRefreshProvider>
```

### TicketeraTokenRefreshProvider
```typescript
import { TicketeraTokenRefreshProvider } from '../components/TicketeraTokenRefreshProvider'

// En tus componentes de ticketera
<TicketeraTokenRefreshProvider intervalMinutes={30}>
  <TicketeraComponent />
</TicketeraTokenRefreshProvider>
```

## 🔄 Interceptores Automáticos

### API Principal
El interceptor en `src/services/core/api.ts` maneja automáticamente:
- Detección de errores 401
- Renovación automática de tokens
- Reintento de requests fallidos
- Logout automático si la renovación falla

### API Ticketera
El interceptor en `microfrontends/ticketera/agentpanel/services/ticketService.ts` maneja:
- Renovación específica para ticketera
- Redirección a login si falla

## 📝 Configuración

### Variables de Entorno
```env
VITE_API_URL=http://localhost:8080/api
VITE_AGENT_API_URL=https://api-int.yego.pro/api/ticketera
```

### Intervalos de Verificación
- **Por defecto**: 30 minutos
- **Configurable**: Pasa `intervalMinutes` a los hooks o providers
- **Mínimo recomendado**: 15 minutos
- **Máximo recomendado**: 60 minutos

## 🎯 Uso Recomendado

### 1. En App.tsx (Principal)
```typescript
import { TokenRefreshProvider } from './components/TokenRefreshProvider'

function App() {
  return (
    <TokenRefreshProvider intervalMinutes={30}>
      <Router>
        <Routes>
          {/* Tus rutas */}
        </Routes>
      </Router>
    </TokenRefreshProvider>
  )
}
```

### 2. En Componentes de Ticketera
```typescript
import { TicketeraTokenRefreshProvider } from '../components/TicketeraTokenRefreshProvider'

function TicketeraModule() {
  return (
    <TicketeraTokenRefreshProvider intervalMinutes={15}>
      <AgentPanel />
      <TVDisplay />
      <TabletInterface />
    </TicketeraTokenRefreshProvider>
  )
}
```

### 3. Renovación Manual
```typescript
import { authService, ticketeraAuthService } from '../services'

// Renovar token principal
const refreshPrincipal = async () => {
  try {
    const response = await authService.refreshToken()
    console.log('Token renovado:', response.accessToken)
  } catch (error) {
    console.error('Error renovando token:', error)
  }
}

// Renovar token ticketera
const refreshTicketera = async () => {
  try {
    const response = await ticketeraAuthService.refreshToken()
    console.log('Token ticketera renovado:', response.accessToken)
  } catch (error) {
    console.error('Error renovando token ticketera:', error)
  }
}
```

## 🔧 Solución de Problemas

### Token No Se Renueva
1. Verificar que el backend esté ejecutándose
2. Verificar que los endpoints estén disponibles
3. Revisar la consola para errores
4. Verificar la configuración de CORS

### Deslogueo Inesperado
1. Verificar que el interceptor esté configurado
2. Verificar que el provider esté envolviendo la app
3. Revisar los logs de la consola
4. Verificar la configuración del backend

### Errores 401 Persistentes
1. Verificar que el token esté en localStorage
2. Verificar que el token no esté corrupto
3. Verificar la configuración de headers
4. Revisar la configuración de CORS

## 📊 Logs de Debug

Los servicios incluyen logs detallados para debugging:
- `🔄` - Inicio de operación
- `✅` - Operación exitosa
- `⚠️` - Advertencia
- `❌` - Error
- `🔍` - Verificación
- `🚨` - Error crítico

## 🎯 Resultado

Con esta implementación:
- ✅ Los tokens se renuevan automáticamente cada 30 minutos
- ✅ Los usuarios no se desloguean inesperadamente
- ✅ Los requests fallidos se reintentan automáticamente
- ✅ Soporte específico para ticketera
- ✅ Logs detallados para debugging
- ✅ Configuración flexible de intervalos
