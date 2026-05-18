import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'yego_app_version';

const UpdateBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const currentVersion = __APP_VERSION__;
    if (!currentVersion) return;

    const storedVersion = localStorage.getItem(STORAGE_KEY);

    if (storedVersion !== currentVersion) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    }
  }, []);

  const handleReload = () => {
    const currentVersion = __APP_VERSION__;
    if (currentVersion) {
      localStorage.setItem(STORAGE_KEY, currentVersion);
    }
    const url = new URL(window.location.href);
    url.searchParams.set('_v', currentVersion || Date.now().toString(36));
    window.location.href = url.toString();
  };

  const handleDismiss = () => {
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 400);
    const currentVersion = __APP_VERSION__;
    if (currentVersion) {
      localStorage.setItem(STORAGE_KEY, currentVersion);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
      <div
        className={`
          pointer-events-auto mt-3 flex items-center gap-3 px-5 py-3
          bg-neutral-900 dark:bg-neutral-800 text-white
          rounded-2xl shadow-2xl border border-neutral-700/50
          backdrop-blur-xl bg-opacity-95
          max-w-md w-full
          transition-all duration-400 ease-out
          ${animateIn ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-6 opacity-0 scale-95'}
        `}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">
            Nueva actualización disponible
          </p>
          <p className="text-xs text-neutral-400 leading-tight mt-0.5">
            Recarga la página para aplicar los cambios
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-700/50 hover:bg-neutral-600 flex items-center justify-center transition-colors"
        >
          <X className="h-3.5 w-3.5 text-neutral-400" />
        </button>

        <button
          onClick={handleReload}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Actualizar</span>
        </button>
      </div>
    </div>
  );
};

export default UpdateBanner;
