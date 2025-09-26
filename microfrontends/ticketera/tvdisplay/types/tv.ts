import React from 'react'
import { Ticket, TVDisplayStats } from './index'

export interface TVDisplayState {
  currentTime: Date
  loading: boolean
  soundEnabled: boolean
  lastUpdate: Date | null
  stats: TVDisplayStats | null
  lastStatsUpdate: Date | null
  driverNames: Record<string, string>
  loadingDrivers: Set<string>
  isFullscreen: boolean
  currentSlide: number
  autoScrollEnabled: boolean
}

export interface TVDisplayActions {
  toggleSound: () => void
  refreshData: () => Promise<void>
  toggleFullscreen: () => void
  nextSlide: () => void
  prevSlide: () => void
  toggleAutoScroll: () => void
  loadDriverNames: () => Promise<void>
  playTicketSound: (status: string) => void
  formatTime: (date: Date) => string
}

export interface UseTVDisplayReturn extends TVDisplayState, TVDisplayActions {
  ticketsEnEspera: Ticket[]
  ticketsLlamados: Ticket[]
  ticketsEnAtencion: Ticket[]
  ticketsCompletados: Ticket[]
  isConnected: boolean
}

export interface TicketQueueSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  tickets: Ticket[]
  driverNames: Record<string, string>
  loadingDrivers: Set<string>
  maxTickets?: number
  showStatus?: boolean
  highlightNew?: boolean
  formatTime: (date: Date) => string
}

export interface TVHeaderProps {
  currentTime: Date
  stats: TVDisplayStats | null
  lastUpdate: Date | null
  soundEnabled: boolean
  onToggleSound: () => void
  onRefresh: () => void
}

export interface TVFooterProps {
  isFullscreen: boolean
  autoScrollEnabled: boolean
  currentSlide: number
  totalSlides: number
  onToggleFullscreen: () => void
  onToggleAutoScroll: () => void
  onNextSlide: () => void
  onPrevSlide: () => void
}

export interface TicketDisplayCardProps {
  ticket: Ticket
  driverName?: string
  showPriority?: boolean
  showModule?: boolean
  showCategory?: boolean
  animate?: boolean
  size?: 'sm' | 'md' | 'lg'
  formatTime: (date: Date) => string
}

export interface StatsOverviewProps {
  stats: TVDisplayStats
  loading: boolean
  lastUpdate: Date | null
}
