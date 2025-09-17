# 🔐 Arquitectura SSO (Single Sign-On) 

## 🎯 Objetivo
Implementar autenticación única entre el **Sistema Principal** y la **Ticketera**, donde el usuario se loguea una sola vez y puede acceder a ambos sistemas sin autenticarse nuevamente.

## 🏗️ Arquitectura

### Componentes:
1. **Sistema Principal** = **Identity Provider (IdP)**
   - Maneja el login del usuario
   - Genera JWT con información del usuario
   - Puerto: 3000

2. **Ticketera** = **Service Provider (SP)**  
   - Consume y valida tokens del sistema principal
   - Puerto: 3030

3. **JWT Token** = **Token de acceso compartido**
   - Contiene: `sub` (username), `role`, `userId`, `iat`, `exp`
   - Firmado con clave secreta compartida

## 🔄 Flujo SSO

### 1. Login Inicial (Sistema Principal)
```
Usuario → Sistema Principal → JWT generado → localStorage['token']
```

### 2. Acceso a Ticketera
```
Usuario → Ticketera Frontend → Validación SSO → Acceso autorizado
```

### 3. Validación SSO (Implementada)
```javascript
// 1. Obtener token del sistema principal
const mainToken = localStorage.getItem('token')
const mainUser = JSON.parse(localStorage.getItem('user'))

// 2. Enviar al backend de ticketera para validación
POST /api/auth/validate-sso
{
  token: mainToken,
  userInfo: { id, username, role, name }
}

// 3. Backend valida el token y autoriza acceso
// 4. Frontend marca como validado
localStorage.setItem('ticketera_validated', 'true')
```

## 📡 Endpoints Requeridos

### Backend de Ticketera
```java
@PostMapping("/auth/validate-sso")
public ResponseEntity<?> validateSSO(@RequestBody SSOValidationRequest request) {
    // 1. Extraer token del request
    String token = request.getToken();
    
    // 2. Validar token usando la misma clave secreta del sistema principal
    if (jwtService.esTokenValido(token)) {
        // 3. Extraer información del usuario
        String username = jwtService.extraerUsername(token);
        String role = jwtService.extraerRol(token);
        
        // 4. Autorizar acceso
        return ResponseEntity.ok(new SSOResponse(true, "Token válido"));
    }
    
    return ResponseEntity.status(403).body(new SSOResponse(false, "Token inválido"));
}
```

## 🔧 Configuración Requerida

### 1. Clave Secreta Compartida
Ambos backends deben usar la **misma clave secreta JWT**:

```java
// Backend Ticketera
private static final String SECRET_KEY = "shared-jwt-secret-key-2024";
```

```typescript
// Backend Sistema Principal (.env)
JWT_SECRET=shared-jwt-secret-key-2024
```

### 2. Validación de Token
El backend de ticketera debe poder validar tokens generados por el sistema principal.

## 🎨 Frontend SSO

### Servicio SSO
- `ssoAuthService.validateMainSystemToken()` - Valida token con backend de ticketera
- `ssoAuthService.isAuthenticated()` - Verifica si está autenticado via SSO
- `ssoAuthService.getMainSystemToken()` - Obtiene token del sistema principal

### Componente AutoAuthWrapper
- Maneja la validación SSO automáticamente
- Muestra estado de autenticación
- Reintenta automáticamente en caso de fallo

### API Interceptor
- Usa siempre el token del sistema principal
- Incluye header `Authorization: Bearer <token>`
- Valida que el token esté autorizado para ticketera

## ✅ Beneficios

1. **Login Único**: Usuario se loguea una sola vez
2. **Escalabilidad**: Fácil agregar más sistemas
3. **Seguridad**: Token centralizado y firmado
4. **UX Profesional**: Sin múltiples logins
5. **Arquitectura Moderna**: Estándar de la industria

## 🚀 Estado Actual

- ✅ Frontend SSO implementado
- ✅ Validación automática de tokens
- ✅ Interfaz de usuario SSO
- ⚠️ **Pendiente**: Endpoint `/auth/validate-sso` en backend de ticketera
- ⚠️ **Pendiente**: Configurar clave secreta compartida

## 🔄 Fallback Actual

Si el backend de ticketera no tiene el endpoint SSO, el sistema:
1. Marca automáticamente como validado
2. Usa el token del sistema principal directamente
3. Confía en que ambos backends usen la misma clave secreta

## 📝 Próximos Pasos

1. **Implementar endpoint SSO** en backend de ticketera
2. **Configurar clave secreta compartida** en ambos backends
3. **Probar flujo completo** de autenticación
4. **Manejar expiración de tokens** y renovación automática
