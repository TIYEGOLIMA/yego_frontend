import { ModuloAtencionFrontend } from '../../services/moduloAtencionService'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'

interface ModuleSelectionProps {
  modules: ModuloAtencionFrontend[]
  onModuleSelect: (moduleId: number) => void
  loading?: boolean
}

export const ModuleSelection = ({ modules, onModuleSelect }: ModuleSelectionProps) => {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
            Seleccione su Módulo
          </h1>
          <p className="text-white-600 dark:text-white-400">
            Elija el módulo en el que trabajará hoy
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {modules.map((module) => (
            <Card
              key={module.id}
              className="cursor-pointer border-0 shadow-xl hover:shadow-2xl bg-white dark:bg-slate-800 border-2 border-red-200 dark:border-red-700 hover:border-red-400 dark:hover:border-red-500 transition-all duration-200 hover:scale-105"
              onClick={() => onModuleSelect(module.id)}
            >
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-lg font-bold text-red-600 dark:text-red-400">
                  {module.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {module.description}
                </p>
                <Button
                  className="w-full bg-red-500 from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-2 font-medium rounded-lg"
                >
                  Seleccionar Módulo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
