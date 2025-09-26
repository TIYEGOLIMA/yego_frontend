import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Upload, 
  FileText, 
  Eye, 
  Trash2, 
  Play,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  FileUp,
  Info,
  X,
  Shield
} from 'lucide-react';
import { useAuth } from "@/shared/hooks/useAuth";
import { api } from '../../../services';
import AccessRestricted from '@/shared/components/AccessRestricted';

interface ImportData {
  id: number;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  type: 'users' | 'roles' | 'permissions';
  totalRows: number;
  processedRows: number;
  errorRows: number;
  createdAt: string;
  user: {
    nombre: string;
  };
  preview?: any[];
  errors?: Record<string, any>;
}

const ImportsModule: React.FC = () => {
  const authState = useAuth();
  const [imports, setImports] = useState<ImportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'users' | 'roles' | 'permissions'>('users');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedImport, setSelectedImport] = useState<ImportData | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchImports();
  }, []);

  const fetchImports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/imports');
      setImports(response.data);
    } catch (error) {
      console.error('Error fetching imports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else {
      alert('Por favor selecciona un archivo CSV válido.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', importType);

      await api.post('/imports/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      fetchImports();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleProcessImport = async (importId: number) => {
    try {
      await api.post(`/imports/${importId}/process`, {});
      fetchImports();
    } catch (error) {
      console.error('Error processing import:', error);
    }
  };

  const handleDeleteImport = async (importId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta importación?')) {
      try {
        await api.delete(`/imports/${importId}`);
        fetchImports();
      } catch (error) {
        console.error('Error deleting import:', error);
      }
    }
  };

  const openPreviewDialog = async (importRecord: ImportData) => {
    try {
      const response = await api.get(`/imports/${importRecord.id}/preview`);
      setSelectedImport(response.data);
      setIsPreviewDialogOpen(true);
    } catch (error) {
      console.error('Error fetching preview:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pendiente</Badge>;
      case 'processing':
        return <Badge variant="primary">Procesando</Badge>;
      case 'completed':
        return <Badge variant="success">Completado</Badge>;
      case 'failed':
        return <Badge variant="error">Fallido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getImportTypeLabel = (type: string) => {
    switch (type) {
      case 'users':
        return 'Usuarios';
      case 'roles':
        return 'Roles';
      case 'permissions':
        return 'Permisos';
      default:
        return type;
    }
  };

  const getImportTypeIcon = (type: string) => {
    switch (type) {
      case 'users':
        return <User className="h-4 w-4 text-primary-500" />;
      case 'roles':
        return <Shield className="h-4 w-4 text-success-500" />;
      case 'permissions':
        return <Shield className="h-4 w-4 text-warning-500" />;
      default:
        return <FileText className="h-4 w-4 text-neutral-500" />;
    }
  };

  if (!authState || !authState.isAuthenticated) {
    return <AccessRestricted />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="yego-heading-1 mb-2">
            Importación Masiva
          </h1>
          <p className="yego-body">
            Importa datos desde archivos CSV con vista previa y validación
          </p>
        </div>
        <Button 
          variant="primary"
          onClick={() => setIsUploadDialogOpen(true)}
          leftIcon={<Upload className="h-4 w-4" />}
        >
          Subir CSV
        </Button>
      </div>

      {/* Import Types Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary-500" />
            Tipos de Importación Soportados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-5 border border-border dark:border-border-dark">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">Usuarios</h3>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">Campos requeridos:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">first_name</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">last_name</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">email</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">national_id</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">role</span>
                </div>
              </div>
            </div>
            
            <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-5 border border-border dark:border-border-dark">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-success-600 dark:text-success-400" />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">Roles</h3>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">Campos requeridos:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-success-500 rounded-full"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">name</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-success-500 rounded-full"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">description</span>
                </div>
              </div>
            </div>
            
            <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-5 border border-border dark:border-border-dark">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">Permisos</h3>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">Campos requeridos:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-warning-500 rounded-full"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">name</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-warning-500 rounded-full"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">module</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-warning-500 rounded-full"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">action</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Imports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-500" />
            Historial de Importaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="yego-body-sm">Cargando importaciones...</p>
              </div>
            </div>
          ) : imports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileUp className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
              <h3 className="yego-heading-4 mb-2">No hay importaciones</h3>
              <p className="yego-body-sm max-w-md">
                No se encontraron importaciones en el sistema. Utiliza el botón "Subir CSV" para comenzar a importar datos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Archivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((importRecord) => (
                    <TableRow key={importRecord.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                            <FileText className="h-4 w-4 text-neutral-500" />
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">{importRecord.filename}</div>
                            <div className="text-xs text-neutral-500">Por: {importRecord.user.nombre}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getImportTypeIcon(importRecord.type)}
                          <Badge variant="outline">
                            {getImportTypeLabel(importRecord.type)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(importRecord.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  importRecord.status === 'failed' ? 'bg-error-500' : 
                                  importRecord.status === 'completed' ? 'bg-success-500' : 'bg-primary-500'
                                }`}
                                style={{ 
                                  width: `${importRecord.totalRows > 0 ? (importRecord.processedRows / importRecord.totalRows) * 100 : 0}%` 
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 min-w-[60px] text-right">
                              {importRecord.processedRows}/{importRecord.totalRows}
                            </span>
                          </div>
                          {importRecord.errorRows > 0 && (
                            <div className="flex items-center gap-2 text-error-600 dark:text-error-400">
                              <AlertTriangle className="h-3 w-3" />
                              <span className="text-xs font-medium">{importRecord.errorRows} errores</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-neutral-500" />
                          <div>
                            <div className="text-sm">{new Date(importRecord.createdAt).toLocaleDateString()}</div>
                            <div className="text-xs text-neutral-500">
                              {new Date(importRecord.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {importRecord.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleProcessImport(importRecord.id)}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPreviewDialog(importRecord)}
                            className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteImport(importRecord.id)}
                            className="text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary-500" />
              Subir Archivo CSV
            </DialogTitle>
            <DialogDescription>
              Selecciona un archivo CSV y el tipo de importación para procesar los datos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <label className="yego-label">Tipo de Importación</label>
              <Select value={importType} onValueChange={(value: any) => setImportType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary-500" />
                      <span>Usuarios</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="roles">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-success-500" />
                      <span>Roles</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="permissions">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-warning-500" />
                      <span>Permisos</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="yego-label">Archivo CSV</label>
              <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-6 text-center hover:border-primary-500 dark:hover:border-primary-500 transition-colors">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                      <Upload className="h-6 w-6 text-neutral-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {selectedFile ? selectedFile.name : 'Haz clic para seleccionar un archivo'}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Solo archivos CSV (máx. 10MB)
                      </p>
                    </div>
                  </div>
                </label>
                {selectedFile && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-success-600 dark:text-success-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Archivo seleccionado</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button 
                variant="secondary" 
                onClick={() => setIsUploadDialogOpen(false)}
                leftIcon={<X className="h-4 w-4" />}
              >
                Cancelar
              </Button>
              <Button 
                variant="primary"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                loading={uploading}
                leftIcon={!uploading ? <Upload className="h-4 w-4" /> : undefined}
              >
                {uploading ? 'Subiendo...' : 'Subir y Procesar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary-500" />
              Vista Previa - {selectedImport?.filename}
            </DialogTitle>
            <DialogDescription>
              Revisa los datos del archivo CSV antes de procesar la importación.
            </DialogDescription>
          </DialogHeader>
          {selectedImport && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 border border-border dark:border-border-dark">
                  <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Total de filas</div>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{selectedImport.totalRows}</div>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 border border-border dark:border-border-dark">
                  <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Procesadas</div>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{selectedImport.processedRows}</div>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 border border-border dark:border-border-dark">
                  <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Errores</div>
                  <div className="text-2xl font-bold text-error-600 dark:text-error-400">{selectedImport.errorRows}</div>
                </div>
              </div>
              
              {selectedImport.preview && selectedImport.preview.length > 0 && (
                <div className="space-y-3">
                  <h3 className="yego-heading-4 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success-500" />
                    Vista Previa (primeras 10 filas)
                  </h3>
                  <div className="overflow-x-auto border border-border dark:border-border-dark rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(selectedImport.preview[0]).map(key => (
                            <TableHead key={key} className="bg-neutral-100 dark:bg-neutral-800 font-medium">
                              {key}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedImport.preview.map((row, index) => (
                          <TableRow key={index} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                            {Object.values(row).map((value, cellIndex) => (
                              <TableCell key={cellIndex}>{String(value)}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {selectedImport.errors && Object.keys(selectedImport.errors).length > 0 && (
                <div className="space-y-3">
                  <h3 className="yego-heading-4 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-error-500" />
                    Errores de Validación
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(selectedImport.errors).map(([row, errors]) => (
                      <div key={row} className="p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-error-100 dark:bg-error-900/50 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-error-600 dark:text-error-400">{row}</span>
                          </div>
                          <span className="font-medium text-error-700 dark:text-error-300">Fila {row}</span>
                        </div>
                        <ul className="space-y-1 pl-8">
                          {Array.isArray(errors) ? errors.map((error, index) => (
                            <li key={index} className="text-sm text-error-600 dark:text-error-400 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-error-500 rounded-full"></div>
                              {error}
                            </li>
                          )) : (
                            <li className="text-sm text-error-600 dark:text-error-400 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-error-500 rounded-full"></div>
                              {String(errors)}
                            </li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedImport.status === 'pending' && (
                <div className="flex justify-end">
                  <Button 
                    variant="primary"
                    onClick={() => {
                      handleProcessImport(selectedImport.id);
                      setIsPreviewDialogOpen(false);
                    }}
                    leftIcon={<Play className="h-4 w-4" />}
                  >
                    Procesar Importación
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportsModule;



