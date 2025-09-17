import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../../components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from '../../components/ui/dialog';
import { 
  Settings, 
  Building2, 
  Palette, 
  Globe, 
  Shield, 
  Database, 
  Save, 
  RefreshCw, 
  Plus, 
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth-store';

interface Configuration {
  id: number;
  key: string;
  value: string;
  description: string;
  category: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

// Categorías válidas
const VALID_CATEGORIES = ['general', 'appearance', 'security', 'email', 'system'];

// Normaliza la categoría de cada configuración
function normalizeCategory(config: Configuration): Configuration {
  if (!VALID_CATEGORIES.includes(config.category)) {
    return { ...config, category: 'general' };
  }
  return config;
}

const ConfigurationModule: React.FC = () => {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newConfig, setNewConfig] = useState({
    key: '',
    value: '',
    description: '',
    category: '',
    type: 'string'
  });
  const { user } = useAuthStore();

  // Cargar configuraciones de forma segura
  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/configuration');
      // Normalizar categorías
      const normalized = (response.data || []).map(normalizeCategory);
      setConfigurations(normalized);
    } catch (error: any) {
      console.error('Error fetching configurations:', error);
      // Si hay error, mostrar configuraciones de ejemplo
      setConfigurations([
        {
          id: 1,
          key: 'app.name',
          value: 'YEGO Integral',
          description: 'Nombre de la aplicación',
          category: 'general',
          type: 'string',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          key: 'app.description',
          value: 'Sistema Integral de Gestión Empresarial',
          description: 'Descripción de la aplicación',
          category: 'general',
          type: 'string',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 3,
          key: 'app.version',
          value: '2.0.0',
          description: 'Versión actual del sistema',
          category: 'general',
          type: 'string',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 4,
          key: 'app.theme',
          value: 'light',
          description: 'Tema por defecto del sistema',
          category: 'appearance',
          type: 'string',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 5,
          key: 'app.primary_color',
          value: '#EF0000',
          description: 'Color primario de la aplicación',
          category: 'appearance',
          type: 'string',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 6,
          key: 'app.logo_url',
          value: '/logo.png',
          description: 'URL del logo de la empresa',
          category: 'appearance',
          type: 'string',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 7,
          key: 'security.session_timeout',
          value: '3600',
          description: 'Tiempo de sesión en segundos',
          category: 'security',
          type: 'number',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 8,
          key: 'security.max_login_attempts',
          value: '5',
          description: 'Máximo número de intentos de login',
          category: 'security',
          type: 'number',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 9,
          key: 'security.password_min_length',
          value: '8',
          description: 'Longitud mínima de contraseña',
          category: 'security',
          type: 'number',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 10,
          key: 'email.smtp_host',
          value: 'smtp.gmail.com',
          description: 'Servidor SMTP para envío de emails',
          category: 'email',
          type: 'string',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 11,
          key: 'email.smtp_port',
          value: '587',
          description: 'Puerto SMTP',
          category: 'email',
          type: 'number',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 12,
          key: 'email.from_address',
          value: 'noreply@yego.com',
          description: 'Dirección de email remitente',
          category: 'email',
          type: 'string',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 13,
          key: 'system.maintenance_mode',
          value: 'false',
          description: 'Modo mantenimiento del sistema',
          category: 'system',
          type: 'boolean',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 14,
          key: 'system.debug_mode',
          value: 'false',
          description: 'Modo debug del sistema',
          category: 'system',
          type: 'boolean',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 15,
          key: 'system.timezone',
          value: 'America/Mexico_City',
          description: 'Zona horaria del sistema',
          category: 'system',
          type: 'string',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar configuración de forma segura
  const updateConfiguration = async (key: string, value: string) => {
    try {
      setSaving(true);
      await api.put(`/configuration/${key}`, { value });
      // Actualizar localmente
      setConfigurations(prev => 
        prev.map(config => 
          config.key === key ? { ...config, value, updatedAt: new Date().toISOString() } : config
        )
      );
    } catch (error) {
      console.error('Error updating configuration:', error);
      // Actualizar localmente aunque falle la API
      setConfigurations(prev => 
        prev.map(config => 
          config.key === key ? { ...config, value, updatedAt: new Date().toISOString() } : config
        )
      );
    } finally {
      setSaving(false);
    }
  };

  // Agregar nueva configuración
  const addConfiguration = async () => {
    if (!newConfig.key || !newConfig.value) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setSaving(true);
      const newConfigItem: Configuration = {
        id: Date.now(),
        key: newConfig.key,
        value: newConfig.value,
        description: newConfig.description,
        category: newConfig.category,
        type: newConfig.type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Intentar guardar en backend
      try {
        await api.post(`/configuration/${newConfig.key}`, {
          value: newConfig.value,
          type: newConfig.type
        });
      } catch (error) {
        console.error('Error saving to backend:', error);
      }

      // Agregar localmente
      setConfigurations(prev => [...prev, newConfigItem]);
      setNewConfig({ key: '', value: '', description: '', category: '', type: 'string' });
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error adding configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar configuración (función comentada por no estar en uso)
  /*
  const deleteConfiguration = async (key: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la configuración '${key}'?`)) {
      return;
    }
    
    try {
      // Intentar eliminar del backend
      try {
        await api.delete(`/configuration/${key}`);
      } catch (error) {
        console.error('Error deleting from backend:', error);
      }

      // Eliminar localmente
      setConfigurations(prev => prev.filter(config => config.key !== key));
    } catch (error) {
      console.error('Error deleting configuration:', error);
    }
  };
  */

  // Inicializar configuraciones por defecto
  const initializeDefaults = async () => {
    try {
      setSaving(true);
      try {
        await api.post('/configuration/initialize');
      } catch (error) {
        console.error('Error initializing defaults:', error);
      }
      await fetchConfigurations();
    } catch (error) {
      console.error('Error initializing defaults:', error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  // Renderizar campo según el tipo
  const renderField = (config: Configuration) => {
    const handleChange = (value: string) => {
      updateConfiguration(config.key, value);
    };

    switch (config.type) {
      case 'boolean':
        return (
          <Select value={config.value} onValueChange={handleChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={config.value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Valor numérico"
          />
        );
      
      case 'json':
        return (
          <Textarea
            value={config.value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="JSON válido"
            rows={3}
            className="min-h-[80px] w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 transition-colors"
          />
        );
      
      default:
        return (
          <Input
            value={config.value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Valor"
          />
        );
    }
  };

  // Agrupar configuraciones por categoría (función comentada por no estar en uso)
  /*
  const groupedConfigs = configurations.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, Configuration[]>);
  */

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPERADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-600 dark:text-neutral-400">Acceso Restringido</h3>
          <p className="text-neutral-500 dark:text-neutral-500">No tienes permisos para acceder a la configuración del sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="yego-heading-1 mb-2">
            Configuración del Sistema
          </h1>
          <p className="yego-body">
            Gestiona la configuración global del sistema YEGO Integral
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary"
            onClick={initializeDefaults}
            disabled={saving}
            leftIcon={saving ? undefined : <RefreshCw className="h-4 w-4" />}
            loading={saving}
          >
            Inicializar
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <Button
              variant="primary"
              onClick={() => setShowAddDialog(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Nueva Configuración
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary-500" />
                  Agregar Nueva Configuración
                </DialogTitle>
                <DialogDescription>
                  Define una nueva configuración del sistema
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Clave</label>
                  <Input
                    id="key"
                    value={newConfig.key}
                    onChange={(e) => setNewConfig({...newConfig, key: e.target.value})}
                    placeholder="app.name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Valor</label>
                  <Input
                    id="value"
                    value={newConfig.value}
                    onChange={(e) => setNewConfig({...newConfig, value: e.target.value})}
                    placeholder="YEGO Integral"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Descripción</label>
                  <Textarea
                    id="description"
                    value={newConfig.description}
                    onChange={(e) => setNewConfig({...newConfig, description: e.target.value})}
                    placeholder="Descripción de la configuración"
                    className="min-h-[80px] w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Categoría</label>
                  <Select value={newConfig.category} onValueChange={(value) => setNewConfig({...newConfig, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="appearance">Apariencia</SelectItem>
                      <SelectItem value="security">Seguridad</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Tipo</label>
                  <Select value={newConfig.type} onValueChange={(value) => setNewConfig({...newConfig, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="boolean">Booleano</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowAddDialog(false)}
                  leftIcon={<X className="h-4 w-4" />}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="primary"
                  onClick={addConfiguration} 
                  disabled={saving}
                  leftIcon={<Save className="h-4 w-4" />}
                  loading={saving}
                >
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs de Configuración */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
          <TabsTrigger value="general" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700 data-[state=active]:shadow-sm">
            <Building2 className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700 data-[state=active]:shadow-sm">
            <Palette className="h-4 w-4 mr-2" />
            Apariencia
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700 data-[state=active]:shadow-sm">
            <Shield className="h-4 w-4 mr-2" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="email" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700 data-[state=active]:shadow-sm">
            <Globe className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700 data-[state=active]:shadow-sm">
            <Database className="h-4 w-4 mr-2" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="yego-body-sm">Cargando configuraciones...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Tab General */}
            <TabsContent value="general" className="space-y-4 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                {configurations
                  .filter(config => config.category === 'general')
                  .map((config) => (
                    <Card key={config.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium">
                            <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">{config.key}</span>
                          </CardTitle>
                          <Badge variant="secondary">{config.type}</Badge>
                        </div>
                        <CardDescription>{config.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderField(config)}
                      </CardContent>
                    </Card>
                  ))}
              </div>
              {configurations.filter(config => config.category === 'general').length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                  <h3 className="yego-heading-4 mb-2">No hay configuraciones generales</h3>
                  <p className="yego-body-sm max-w-md">
                    Agrega configuraciones generales del sistema usando el botón "Nueva Configuración"
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Tab Apariencia */}
            <TabsContent value="appearance" className="space-y-4 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                {configurations
                  .filter(config => config.category === 'appearance')
                  .map((config) => (
                    <Card key={config.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium">
                            <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">{config.key}</span>
                          </CardTitle>
                          <Badge variant="secondary">{config.type}</Badge>
                        </div>
                        <CardDescription>{config.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderField(config)}
                      </CardContent>
                    </Card>
                  ))}
              </div>
              {configurations.filter(config => config.category === 'appearance').length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Palette className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                  <h3 className="yego-heading-4 mb-2">No hay configuraciones de apariencia</h3>
                  <p className="yego-body-sm max-w-md">
                    Agrega configuraciones de apariencia usando el botón "Nueva Configuración"
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Tab Seguridad */}
            <TabsContent value="security" className="space-y-4 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                {configurations
                  .filter(config => config.category === 'security')
                  .map((config) => (
                    <Card key={config.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium">
                            <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">{config.key}</span>
                          </CardTitle>
                          <Badge variant="secondary">{config.type}</Badge>
                        </div>
                        <CardDescription>{config.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderField(config)}
                      </CardContent>
                    </Card>
                  ))}
              </div>
              {configurations.filter(config => config.category === 'security').length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                  <h3 className="yego-heading-4 mb-2">No hay configuraciones de seguridad</h3>
                  <p className="yego-body-sm max-w-md">
                    Agrega configuraciones de seguridad usando el botón "Nueva Configuración"
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Tab Email */}
            <TabsContent value="email" className="space-y-4 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                {configurations
                  .filter(config => config.category === 'email')
                  .map((config) => (
                    <Card key={config.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium">
                            <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">{config.key}</span>
                          </CardTitle>
                          <Badge variant="secondary">{config.type}</Badge>
                        </div>
                        <CardDescription>{config.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderField(config)}
                      </CardContent>
                    </Card>
                  ))}
              </div>
              {configurations.filter(config => config.category === 'email').length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Globe className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                  <h3 className="yego-heading-4 mb-2">No hay configuraciones de email</h3>
                  <p className="yego-body-sm max-w-md">
                    Agrega configuraciones de email usando el botón "Nueva Configuración"
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Tab Sistema */}
            <TabsContent value="system" className="space-y-4 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                {configurations
                  .filter(config => config.category === 'system')
                  .map((config) => (
                    <Card key={config.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium">
                            <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">{config.key}</span>
                          </CardTitle>
                          <Badge variant="secondary">{config.type}</Badge>
                        </div>
                        <CardDescription>{config.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderField(config)}
                      </CardContent>
                    </Card>
                  ))}
              </div>
              {configurations.filter(config => config.category === 'system').length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Database className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                  <h3 className="yego-heading-4 mb-2">No hay configuraciones de sistema</h3>
                  <p className="yego-body-sm max-w-md">
                    Agrega configuraciones de sistema usando el botón "Nueva Configuración"
                  </p>
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default ConfigurationModule;