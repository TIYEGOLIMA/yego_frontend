import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { useAuthStore } from '../../../store/auth-store';
import { Sparkles } from 'lucide-react';

const WelcomeModule: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background-secondary dark:bg-background-dark flex items-center justify-center p-4">
      <div className="w-full flex items-center justify-center -mt-24">
        <Card className="w-full max-w-2xl border border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-8 sm:p-12">
            <div className="text-center flex flex-col items-center justify-center">
              {/* Logo/Icono */}
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
              </div>

              {/* Mensaje de Bienvenida */}
              <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                ¡Bienvenido a YEGO!
              </h1>
              
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-2">
                Sistema Integral de Gestión
              </p>
              
              {user?.name && (
                <p className="text-base text-neutral-500 dark:text-neutral-500 mt-4">
                  {user.name}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WelcomeModule;
