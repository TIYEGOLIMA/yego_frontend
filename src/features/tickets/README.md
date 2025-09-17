# Módulo de Tickets - AgentPanel Integrado

Este módulo integra el AgentPanel como un microfrontend dentro del sistema principal Yego Integral.

## Archivos

### `tickets.module.tsx`
- Punto de entrada principal del módulo
- Renderiza el `TicketeraWrapper`

### `TicketeraWrapper.tsx`
- Componente wrapper que maneja la integración
- Incluye manejo de errores con fallback
- Renderiza el `AgentPanelAdapted`

### `AgentPanelAdapted.tsx`
- Versión adaptada del AgentPanel original
- Integrado con el sistema de autenticación principal (`useAuthStore`)
- Usa los estilos y componentes del sistema principal
- Interfaz funcional pero simplificada

## Integración

### Autenticación
- ✅ Usa `useAuthStore` del sistema principal
- ✅ Muestra información del usuario logueado
- ✅ Botón de logout integrado

### Estilos
- ✅ Usa Tailwind CSS del sistema principal
- ✅ Diseño responsive
- ✅ Tema consistente con el sistema

### Funcionalidad
- 🔄 **En desarrollo**: Conexión con APIs del backend
- 🔄 **En desarrollo**: WebSocket para tiempo real
- 🔄 **En desarrollo**: Gestión real de tickets

## Próximos Pasos

1. **Conectar APIs**: Integrar con los endpoints del backend para tickets
2. **WebSocket**: Configurar conexión en tiempo real
3. **Componentes completos**: Migrar componentes específicos del AgentPanel original
4. **Servicios**: Adaptar servicios para usar las APIs del sistema principal

## Microfrontend Original

Los archivos originales del AgentPanel están disponibles en:
```
frontend/microfrontends/agentpanel/
```

Estos archivos contienen la implementación completa pero necesitan adaptación de rutas y servicios para funcionar en el sistema principal.

## Estructura de Archivos

```
tickets/
├── README.md                    # Este archivo
├── tickets.module.tsx           # Punto de entrada
├── TicketeraWrapper.tsx         # Wrapper con manejo de errores
└── AgentPanelAdapted.tsx        # AgentPanel adaptado al sistema principal
```

