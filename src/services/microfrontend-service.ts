import { MicrofrontendConfig, getMicrofrontend } from '../config/microfrontends';

export class MicrofrontendService {
  private static instance: MicrofrontendService;
  private loadedMicrofrontends: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): MicrofrontendService {
    if (!MicrofrontendService.instance) {
      MicrofrontendService.instance = new MicrofrontendService();
    }
    return MicrofrontendService.instance;
  }

  /**
   * Carga un microfrontend específico
   */
  public async loadMicrofrontend(name: string): Promise<boolean> {
    try {
      const config = getMicrofrontend(name);
      if (!config) {
        console.error(`Microfrontend '${name}' no encontrado`);
        return false;
      }

      if (this.loadedMicrofrontends.has(name)) {
        console.log(`Microfrontend '${name}' ya está cargado`);
        return true;
      }

      console.log(`Cargando microfrontend: ${config.name}`);
      
      // Aquí se podría implementar la lógica de carga dinámica
      // Por ahora, simplemente marcamos como cargado
      this.loadedMicrofrontends.add(name);
      
      console.log(`Microfrontend '${name}' cargado exitosamente`);
      return true;
    } catch (error) {
      console.error(`Error cargando microfrontend '${name}':`, error);
      return false;
    }
  }

  /**
   * Verifica si un microfrontend está cargado
   */
  public isLoaded(name: string): boolean {
    return this.loadedMicrofrontends.has(name);
  }

  /**
   * Descarga un microfrontend
   */
  public unloadMicrofrontend(name: string): boolean {
    if (this.loadedMicrofrontends.has(name)) {
      this.loadedMicrofrontends.delete(name);
      console.log(`Microfrontend '${name}' descargado`);
      return true;
    }
    return false;
  }

  /**
   * Obtiene la lista de microfrontends cargados
   */
  public getLoadedMicrofrontends(): string[] {
    return Array.from(this.loadedMicrofrontends);
  }
}

export const microfrontendService = MicrofrontendService.getInstance();
