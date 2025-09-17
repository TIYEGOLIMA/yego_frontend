# Microfrontends - Yego Integral

Esta carpeta contiene los microfrontends integrados en el sistema principal de Yego Integral.

## Arquitectura

El sistema principal (`yego_integral_v4`) actúa como un **host** que aloja otros sistemas independientes desarrollados como microfrontends. Esto permite:

- **Desarrollo independiente**: Cada microfrontend puede desarrollarse por separado
- **Despliegue independiente**: Los microfrontends pueden actualizarse sin afectar el sistema principal
- **Tecnologías diversas**: Cada microfrontend puede usar diferentes tecnologías
- **Escalabilidad**: Fácil agregar nuevos sistemas

## Estructura

```
microfrontends/
├── README.md
├── agentpanel/          # Panel de agente para tickets
│   ├── AgentPanel.tsx   # Componente principal
│   ├── components/      # Componentes específicos del agente
│   ├── hooks/          # useAgentPanel y dependencias
│   ├── types/          # Definiciones de tipos TypeScript
│   └── contexts/       # SocketContext
└── [otros-sistemas]/   # Futuros microfrontends
```

## Microfrontends Disponibles

### 1. AgentPanel
- **Origen**: `C:\Users\Giomar\ticketera_front` (solo AgentPanel y dependencias)
- **Descripción**: Panel de agente para gestión de tickets y colas de atención
- **Componente principal**: `AgentPanel.tsx`
- **Estado**: Integrado como wrapper - Solo archivos necesarios

## Configuración

Los microfrontends se configuran en:
- `src/config/microfrontends.ts` - Configuración de cada microfrontend
- `src/services/microfrontend-service.ts` - Servicio de gestión
- `src/features/tickets/TicketeraWrapper.tsx` - Wrapper de integración

## Integración

1. **Copia de archivos**: Los archivos del proyecto original se copian a `microfrontends/[nombre]/`
2. **Wrapper de integración**: Se crea un componente wrapper que adapta el microfrontend al sistema principal
3. **Configuración de rutas**: Se registra en el routing del sistema principal
4. **Servicios**: Se integra con los servicios de autenticación y API del sistema principal

## Próximos Pasos

Para completar la integración del AgentPanel:

1. **Adaptar autenticación**: Usar el sistema de auth del proyecto principal
2. **Configurar APIs**: Conectar con los endpoints del backend principal
3. **Estilos**: Adaptar los estilos para que coincidan con el tema del sistema
4. **WebSocket**: Integrar con el sistema de WebSocket existente
5. **Permisos**: Integrar con el sistema de roles y permisos

## Agregar Nuevos Microfrontends

1. Crear carpeta en `microfrontends/[nombre]/`
2. Copiar archivos del proyecto original
3. Crear wrapper de integración
4. Registrar en `microfrontends.ts`
5. Agregar ruta en `App.tsx`
6. Configurar permisos en el sidebar
