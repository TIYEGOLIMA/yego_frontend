# Integración Backend - Sistema de Sistemas Externos

## Endpoint para Cambio de Estado

### Petición
```
PUT /sistemas-externos/{id}/toggle-active
```

### Payload
```json
{
  "activo": false
}
```

### Respuesta Esperada
```json
{
  "success": true,
  "message": "Estado del sistema actualizado correctamente",
  "data": {
    "id": 1,
    "nombre": "Sistema de Pagos",
    "activo": false,
    "url": "http://localhost:8081/api/pagos"
  }
}
```

## Comportamiento del Backend

### Cuando `activo: true` (Activando)
1. Actualizar el estado en la base de datos
2. Opcionalmente enviar notificación de activación al sistema externo
3. Devolver respuesta exitosa

### Cuando `activo: false` (Desactivando) - **IMPORTANTE**
1. Actualizar el estado en la base de datos
2. **ENVIAR WEBSOCKET** a la URL del sistema externo para notificar que ya no debe ayudar
3. El mensaje del WebSocket debe ser algo como:
   ```json
   {
     "type": "SYSTEM_DEACTIVATED",
     "message": "Este sistema ha sido desactivado. Deja de procesar solicitudes.",
     "timestamp": "2024-01-15T10:30:00Z",
     "sistemaId": 1,
     "sistemaNombre": "Sistema de Pagos"
   }
   ```
4. Devolver respuesta exitosa

## Ejemplo de Implementación Backend (Pseudocódigo)

```javascript
app.put('/sistemas-externos/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    
    // 1. Actualizar en base de datos
    const sistema = await SistemaExterno.findById(id);
    sistema.activo = activo;
    await sistema.save();
    
    // 2. Si se está desactivando, enviar WebSocket al sistema externo
    if (!activo) {
      const webSocketMessage = {
        type: 'SYSTEM_DEACTIVATED',
        message: 'Este sistema ha sido desactivado. Deja de procesar solicitudes.',
        timestamp: new Date().toISOString(),
        sistemaId: id,
        sistemaNombre: sistema.nombre
      };
      
      // Enviar WebSocket a la URL del sistema externo
      await enviarWebSocketASistemaExterno(sistema.url, webSocketMessage);
      
      console.log(`📡 WebSocket enviado a ${sistema.url} - Sistema desactivado`);
    }
    
    // 3. Devolver respuesta
    res.json({
      success: true,
      message: `Sistema ${activo ? 'activado' : 'desactivado'} correctamente`,
      data: sistema
    });
    
  } catch (error) {
    console.error('Error cambiando estado del sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado del sistema'
    });
  }
});
```

## Notas Importantes

1. **WebSocket Obligatorio**: Cuando `activo: false`, SIEMPRE enviar WebSocket al sistema externo
2. **Manejo de Errores**: Si el WebSocket falla, registrar el error pero no fallar la operación
3. **Logging**: Registrar todas las operaciones de cambio de estado
4. **Seguridad**: Validar que el usuario tenga permisos para cambiar el estado
5. **Validación**: Verificar que el sistema existe antes de actualizar

## Eventos WebSocket del Sistema Externo

El sistema externo debe estar preparado para recibir y procesar estos mensajes:

```json
{
  "type": "SYSTEM_DEACTIVATED",
  "message": "Este sistema ha sido desactivado. Deja de procesar solicitudes.",
  "timestamp": "2024-01-15T10:30:00Z",
  "sistemaId": 1,
  "sistemaNombre": "Sistema de Pagos"
}
```

Cuando reciba este mensaje, debe:
1. Detener el procesamiento de nuevas solicitudes
2. Finalizar las solicitudes en curso de manera segura
3. Cambiar su estado interno a "INACTIVO"
4. Opcionalmente enviar confirmación de recepción

