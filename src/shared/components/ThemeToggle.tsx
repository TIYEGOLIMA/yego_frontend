import React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { Button } from "../../components/ui/button";

export const ThemeToggle: React.FC = () => {
  const { theme, changeTheme } = useTheme();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    changeTheme(newTheme);
  };

  return (
    <div className="relative">
      {/* Efecto de fondo glassmorphism */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 dark:from-neutral-900/20 dark:to-neutral-800/10 rounded-2xl blur-sm"></div>
      
      {/* Contenedor principal con glassmorphism */}
      <div className="relative flex items-center glassmorphism rounded-xl sm:rounded-2xl p-1.5 shadow-lg backdrop-blur-md border border-white/20 dark:border-neutral-800/50">
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 sm:h-9 sm:w-9 rounded-xl transition-all duration-300 ${
            theme === "light"
              ? "bg-white/20 dark:bg-neutral-700/50 text-warning-600 shadow-lg backdrop-blur-sm border border-white/30 dark:border-neutral-600/50"
              : "text-neutral-500 dark:text-neutral-400 hover:text-warning-500 hover:bg-white/10 dark:hover:bg-neutral-800/30"
          }`}
          onClick={() => handleThemeChange("light")}
          title="Modo claro"
        >
          <Sun className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 sm:h-9 sm:w-9 rounded-xl transition-all duration-300 ${
            theme === "dark"
              ? "bg-white/20 dark:bg-neutral-700/50 text-primary-500 shadow-lg backdrop-blur-sm border border-white/30 dark:border-neutral-600/50"
              : "text-neutral-500 dark:text-neutral-400 hover:text-primary-500 hover:bg-white/10 dark:hover:bg-neutral-800/30"
          }`}
          onClick={() => handleThemeChange("dark")}
          title="Modo oscuro"
        >
          <Moon className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 sm:h-9 sm:w-9 rounded-xl transition-all duration-300 ${
            theme === "system"
              ? "bg-white/20 dark:bg-neutral-700/50 text-neutral-700 dark:text-neutral-300 shadow-lg backdrop-blur-sm border border-white/30 dark:border-neutral-600/50"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-white/10 dark:hover:bg-neutral-800/30"
          }`}
          onClick={() => handleThemeChange("system")}
          title="Detectar tema del sistema"
        >
          <Monitor className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};