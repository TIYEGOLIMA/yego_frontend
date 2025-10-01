# 🔧 Solución para Autenticación WebSocket

## 🚨 Problema Identificado

El backend **Spring Boot** no está configurado para autenticar conexiones **Socket.IO/WebSocket**. 

### Logs del Error:
```
Securing GET /socket.io/?token=...
Set SecurityContextHolder to anonymous SecurityContext  
Acceso no autorizado: Full authentication is required to access this resource
```

## ✅ Solución del Backend (Spring Boot)

### 1. Configurar WebSocket Security

Crear o modificar la clase de configuración WebSocket:

```java
@Configuration
@EnableWebSocketSecurity
public class WebSocketSecurityConfig {

    @Autowired
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Autowired
    private JwtRequestFilter jwtRequestFilter;

    @Bean
    public AuthorizationManager<Message<?>> messageAuthorizationManager(
            MessageMatcherDelegatingAuthorizationManager.Builder messages) {
        return messages
                // Permitir handshake de Socket.IO sin autenticación
                .simpDestMatchers("/socket.io/**").permitAll()
                .nullDestMatcher().permitAll()
                // Requerir autenticación para otros mensajes
                .anyMessage().authenticated()
                .build();
    }
}
```

### 2. Crear Filtro de Autenticación para WebSocket

```java
@Component
public class WebSocketAuthenticationFilter implements Filter {

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        
        // Solo procesar rutas de Socket.IO
        if (httpRequest.getRequestURI().startsWith("/socket.io/")) {
            String token = extractTokenFromRequest(httpRequest);
            
            if (token != null && jwtTokenUtil.validateToken(token)) {
                String username = jwtTokenUtil.getUsernameFromToken(token);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        
        chain.doFilter(request, response);
    }

    private String extractTokenFromRequest(HttpServletRequest request) {
        // Buscar token en query parameter
        String token = request.getParameter("token");
        if (token != null) {
            return token;
        }
        
        // Buscar token en header Authorization
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        
        // Buscar token en header personalizado
        return request.getHeader("X-Auth-Token");
    }
}
```

### 3. Registrar el Filtro

En tu `SecurityConfig.java`:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private WebSocketAuthenticationFilter webSocketAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // ... tu configuración existente ...
            .addFilterBefore(webSocketAuthFilter, UsernamePasswordAuthenticationFilter.class)
            // Permitir Socket.IO endpoints
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/socket.io/**").permitAll()
                // ... resto de tu configuración ...
            );
        
        return http.build();
    }
}
```

### 4. Configurar CORS para WebSocket

```java
@Configuration
public class WebSocketConfig implements WebSocketConfigurer {

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new MyWebSocketHandler(), "/socket.io/*")
                .setAllowedOrigins("http://localhost:5173", "http://localhost:3000")
                .withSockJS();
    }
}
```

## 🚀 Habilitar en el Frontend

Una vez configurado el backend, en `socket-service.ts` cambiar:

```typescript
const DISABLE_WEBSOCKET = false; // Cambiar de true a false
```

## 🧪 Verificar la Solución

1. **Backend configurado** ✅
2. **Frontend habilitado** ✅
3. **Logs esperados**:
   ```
   ✅ [SocketService] Socket.IO conectado exitosamente
   📝 [SocketService] Sesión registrada
   ```

## 📋 Checklist

- [ ] Crear `WebSocketSecurityConfig`
- [ ] Crear `WebSocketAuthenticationFilter`
- [ ] Registrar filtro en `SecurityConfig`
- [ ] Configurar CORS para WebSocket
- [ ] Cambiar `DISABLE_WEBSOCKET = false` en frontend
- [ ] Probar conexión

---

**Nota**: Mientras el backend no esté configurado, el WebSocket permanecerá deshabilitado para evitar errores en consola.
