import TicketeraWrapper from './tickets/TicketeraWrapper'
import Reports from './views/reports/Reports'
import TVDisplay from './views/tvdisplay/TVDisplay'
import RatingTablet from './views/ratingtablet/RatingTablet'
import TabletInterface from './views/tabletinterface/TabletInterface'
import { useTicketeraSessionRenewal } from './application'

export function TicketeraModule() {
  useTicketeraSessionRenewal()
  return <TicketeraWrapper />
}

export function TicketeraReportsModule() {
  useTicketeraSessionRenewal()
  return <Reports />
}

export function TVDisplayPage() {
  useTicketeraSessionRenewal()
  return <TVDisplay />
}

export function RatingTabletPage() {
  useTicketeraSessionRenewal()
  return <RatingTablet />
}

export function MainTabletPage() {
  useTicketeraSessionRenewal()
  return <TabletInterface />
}

export default TicketeraModule
