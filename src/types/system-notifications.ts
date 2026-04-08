export interface ForcedLogoutEvent {
  type: 'FORCED_LOGOUT'
  message: string
  userId: number
  username: string
  timestamp: string
}

export interface AccountBlockedEvent {
  type: 'ACCOUNT_BLOCKED'
  message: string
  userId: number
  username: string
  autoLogoutDelay: number
  timestamp: string
}

export interface UserTableUpdateEvent {
  type: 'USER_TABLE_UPDATE'
  action: 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'USER_STATUS_CHANGED'
  userId: number
  username: string
  message: string
  timestamp: string
}

export interface PremiumProcessAvailableEvent {
  type: 'PREMIUN_PROCESS_AVAILABLE'
  message: string
  month: number
  year: number
  timestamp: string
}

export interface RoleDeactivatedEvent {
  type: 'ROLE_DEACTIVATED'
  message: string
  autoLogoutDelay: number
  redirectToLogin: boolean
  roleName?: string
  timestamp?: string
}

/** Alguien llamó a /api/yango-external/* (excepto /logs); el panel de API puede refrescar datos */
export interface YangoApiLogUpdatedEvent {
  type: 'YANGO_API_LOG_UPDATED'
  logId: number
  endpoint: string
  timestamp: string
}

export type SystemEvent =
  | ForcedLogoutEvent
  | AccountBlockedEvent
  | UserTableUpdateEvent
  | PremiumProcessAvailableEvent
  | RoleDeactivatedEvent
  | YangoApiLogUpdatedEvent
