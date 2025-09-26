// 🎯 TIPOS COMPARTIDOS PARA MICROFRONTENDS

export type TicketStatus = 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FALLING';

export interface TouchUIConfig {
  LARGE_BUTTONS: boolean;
  TOUCH_FRIENDLY: boolean;
  HIGH_CONTRAST?: boolean;
  SHOW_VIRTUAL_KEYBOARD?: boolean;
  AUTO_ADVANCE?: boolean;
  SHOW_EMOJI?: boolean;
}

export interface SoundConfig {
  ENABLED_BY_DEFAULT: boolean;
  SOUNDS: {
    NEW_TICKET: string;
    TICKET_CALLED: string;
    TICKET_COMPLETED: string;
    TICKET_CANCELLED: string;
  };
}
