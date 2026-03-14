import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  Brain,
  FileText,
  Users,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, stageKey: null },
  { to: '/ingest', label: 'Ingest Data', icon: Upload, stageKey: 'ingest' },
  { to: '/analysis', label: 'Analysis', icon: Brain, stageKey: 'analysis' },
  { to: '/documents', label: 'Documents', icon: FileText, stageKey: 'docs' },
  { to: '/assignments', label: 'Assignments', icon: Users, stageKey: 'assign' },
]

const connectedTools = [
  { name: 'Unsiloed', envKey: 'VITE_UNSILOED_KEY' },
  { name: 'Crustdata', envKey: 'VITE_CRUSTDATA_KEY' },
  { name: 'S2.dev', envKey: 'VITE_S2_TOKEN' },
]

function isKeyConfigured(envKey) {
  const value = import.meta.env[envKey]
  return !!value && !value.startsWith('your_')
}

export default function Sidebar() {
  const { pipelineStatus } = useAppContext()
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple/20 border border-purple/30 flex items-center justify-center">
            <span className="text-purple font-bold text-sm leading-none font-mono">S</span>
          </div>
          <span className="text-base font-semibold text-text-primary tracking-tight">Sprint It</span>
        </div>
        <button
          data-testid="sidebar-mobile-close"
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-text-secondary hover:text-text-primary transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 mt-1">
        {navItems.map(({ to, label, icon: Icon, stageKey }) => {
          const isComplete = stageKey && pipelineStatus[stageKey] === 'complete'
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative mb-0.5 ${
                  isActive
                    ? 'bg-purple/10 text-purple'
                    : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-purple rounded-r-full shadow-[0_0_8px_rgba(139,124,246,0.5)]" />
                  )}
                  <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                  <span className="flex-1">{label}</span>
                  {isComplete && (
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="px-4 pb-5">
        <p className="text-[10px] font-medium text-text-secondary/60 uppercase tracking-widest mb-2.5 px-2">
          Connections
        </p>
        <div className="space-y-1.5">
          {connectedTools.map(({ name, envKey }) => {
            const connected = isKeyConfigured(envKey)
            return (
              <div
                key={name}
                data-testid={`tool-status-${name.toLowerCase()}`}
                className="flex items-center gap-2 px-2 py-1 text-[12px] text-text-secondary"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    connected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-white/15'
                  }`}
                />
                <span>{name}</span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )

  return (
    <>
      <button
        data-testid="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 w-9 h-9 rounded-lg bg-bg-card border border-border flex items-center justify-center"
      >
        <Menu size={18} className="text-text-primary" />
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          bg-bg-card border-r border-border h-screen flex flex-col sticky top-0 z-50
          w-56 shrink-0
          max-md:fixed max-md:left-0 max-md:top-0 max-md:transition-transform max-md:duration-200
          ${mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
