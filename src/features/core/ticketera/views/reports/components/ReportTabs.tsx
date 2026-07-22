import { LayoutDashboard, ListFilter, Route } from 'lucide-react'

export type ReportTab = 'summary' | 'options' | 'traceability'

interface Props {
  activeTab: ReportTab
  onChange: (tab: ReportTab) => void
}

const TABS = [
  { id: 'summary' as const, label: 'Resumen operativo', icon: LayoutDashboard },
  { id: 'options' as const, label: 'Opciones más elegidas', icon: ListFilter },
  { id: 'traceability' as const, label: 'Trazabilidad', icon: Route },
]

export function ReportTabs({ activeTab, onChange }: Props) {
  return (
    <nav
      className="mb-6 flex max-w-full gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700"
      role="tablist"
      aria-label="Secciones del reporte"
    >
      {TABS.map((tab) => {
        const TabIcon = tab.icon
        const selected = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${selected ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            <TabIcon className="h-4 w-4" />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
