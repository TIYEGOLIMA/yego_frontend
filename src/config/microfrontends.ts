// Configuración de microfrontends
export interface MicrofrontendConfig {
  name: string;
  path: string;
  component: string;
  description: string;
  version: string;
  dependencies?: string[];
}

export const microfrontends: Record<string, MicrofrontendConfig> = {
  agentpanel: {
    name: 'AgentPanel',
    path: '/microfrontends/agentpanel',
    component: 'AgentPanelWrapper',
    description: 'Panel de agente para gestión de tickets y colas de atención',
    version: '1.0.0',
    dependencies: ['react', 'typescript', 'tailwindcss']
  }
};

export const getMicrofrontend = (name: string): MicrofrontendConfig | null => {
  return microfrontends[name] || null;
};

export const getAllMicrofrontends = (): MicrofrontendConfig[] => {
  return Object.values(microfrontends);
};
