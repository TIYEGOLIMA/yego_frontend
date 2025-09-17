import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  BarChart3, 
  Users, 
  Shield, 
  Activity, 
  FileText, 
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChartPie,
  FileDown
} from 'lucide-react';
import { useAuth } from "@/shared/hooks/useAuth";
import api from "@/services/api";
import AccessRestricted from '@/shared/components/AccessRestricted';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalPermissions: number;
  totalAuditLogs: number;
  totalImports: number;
  activeSessions: number;
  recentActivity: {
    date: string;
    count: number;
  }[];
  topActions: {
    action: string;
    count: number;
  }[];
  topResources: {
    resource: string;
    count: number;
  }[];
}

interface UserStats {
  id: number;
  nombre: string;
  email: string;
  role: string;
  lastLogin: string;
  sessionCount: number;
  auditCount: number;
}

const ReportsModule: React.FC = () => {
  const authState = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [selectedReport, setSelectedReport] = useState<string>('overview');

  const periods = [
    { value: '7', label: 'Últimos 7 días' },
    { value: '30', label: 'Últimos 30 días' },
    { value: '90', label: 'Últimos 90 días' },
    { value: '365', label: 'Último año' }
  ];

  const reports = [
    { value: 'overview', label: 'Vista General' },
    { value: 'users', label: 'Reporte de Usuarios' },
    { value: 'audit', label: 'Reporte de Auditoría' },
    { value: 'sessions', label: 'Reporte de Sesiones' }
  ];

  useEffect(() => {
    fetchStats();
  }, [selectedPeriod]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [statsResponse, auditStatsResponse] = await Promise.all([
        api.get('/reports/stats', { params: { days: selectedPeriod } }),
        api.get('/audit/stats', { params: { days: selectedPeriod } })
      ]);

      // Combinar estadísticas del sistema y auditoría
      const combinedStats: SystemStats = {
        totalUsers: statsResponse.data.totalUsers || 0,
        activeUsers: statsResponse.data.activeUsers || 0,
        totalRoles: statsResponse.data.totalRoles || 0,
        totalPermissions: statsResponse.data.totalPermissions || 0,
        totalAuditLogs: auditStatsResponse.data.totalLogs || 0,
        totalImports: statsResponse.data.totalImports || 0,
        activeSessions: statsResponse.data.activeSessions || 0,
        recentActivity: auditStatsResponse.data.dailyStats || [],
        topActions: auditStatsResponse.data.actions || [],
        topResources: auditStatsResponse.data.resources || []
      };

      setStats(combinedStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/reports/users');
      setUserStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const exportReport = async (type: string) => {
    try {
      const response = await api.get(`/reports/export/${type}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte-${type}-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Error al exportar el reporte');
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
            Reportes del Sistema
          </h1>
          <p className="yego-body">
            Estadísticas y análisis del sistema Yego Integral
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary"
            onClick={fetchStats}
            disabled={loading}
            leftIcon={loading ? undefined : <RefreshCw className="h-4 w-4" />}
            loading={loading}
          >
            Actualizar
          </Button>
          <Button 
            variant="secondary"
            onClick={() => exportReport('general')}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(period => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Tipo de Reporte</label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reports.map(report => (
                    <SelectItem key={report.value} value={report.value}>
                      {report.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      {selectedReport === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Usuarios Totales</CardTitle>
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                {stats?.activeUsers || 0} activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Roles</CardTitle>
              <div className="w-8 h-8 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-success-600 dark:text-success-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats?.totalRoles || 0}</div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                {stats?.totalPermissions || 0} permisos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Sesiones Activas</CardTitle>
              <div className="w-8 h-8 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center">
                <Activity className="h-4 w-4 text-warning-600 dark:text-warning-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats?.activeSessions || 0}</div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                {stats?.totalAuditLogs || 0} eventos auditados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Importaciones</CardTitle>
              <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats?.totalImports || 0}</div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Archivos procesados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Charts */}
      {selectedReport === 'overview' && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary-500" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.slice(0, 7).map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">{new Date(day.date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                        <div 
                          className="bg-primary-500 h-2 rounded-full"
                          style={{ 
                            width: `${Math.min((day.count / Math.max(...stats.recentActivity.map(d => d.count))) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{day.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartPie className="h-5 w-5 text-primary-500" />
                Acciones Más Frecuentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topActions.slice(0, 5).map((action, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-neutral-700 dark:text-neutral-300">{action.action}</span>
                    <Badge variant="primary">{action.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Stats Table */}
      {selectedReport === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-500" />
              Estadísticas de Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Button 
                variant="secondary"
                onClick={fetchUserStats}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Cargar Estadísticas de Usuarios
              </Button>
            </div>
            {userStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                <h3 className="yego-heading-4 mb-2">No hay datos de usuarios</h3>
                <p className="yego-body-sm max-w-md">
                  Haz clic en "Cargar Estadísticas de Usuarios" para ver los datos.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Último Login</TableHead>
                      <TableHead>Sesiones</TableHead>
                      <TableHead>Eventos Auditados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userStats.map((user) => (
                      <TableRow key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">{user.nombre}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Nunca'}
                        </TableCell>
                        <TableCell>{user.sessionCount}</TableCell>
                        <TableCell>{user.auditCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary-500" />
            Exportar Reportes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="secondary" 
              onClick={() => exportReport('users')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <span>Usuarios</span>
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => exportReport('audit')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <div className="w-10 h-10 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <span>Auditoría</span>
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => exportReport('sessions')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <span>Sesiones</span>
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => exportReport('general')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <span>General</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsModule;