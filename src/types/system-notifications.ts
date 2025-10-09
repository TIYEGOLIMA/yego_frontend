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

export type SystemEvent = ForcedLogoutEvent | AccountBlockedEvent | UserTableUpdateEvent
