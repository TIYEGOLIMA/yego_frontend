export type { Ticket } from '@/features/core/ticketera/domain'

export interface User {
  id: number
  username: string
  name: string
  email: string
  role: string
  active: boolean
  lastLogin?: string
  moduleId?: number
}
