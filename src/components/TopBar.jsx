import { NavLink } from 'react-router-dom'
import { useState } from 'react'
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
  { to: '/ingest', label: 'Ingest', icon: Upload, stageKey: 'ingest' },
  { to: '/analysis', label: 'Analysis', icon: Brain, stageKey: 'analysis' },
  { to: '/documents', label: 'Docs', icon: FileText, stageKey: 'docs' },
  { to: '/assignments', label: 'Assign', icon: Users, stageKey: 'assign' },
]

const connectedTools = [
  { name: 'Unsiloed', envKey: 'VITE_UNSILOED_KEY' },
  { name: 'Crustdata', envKey: 'VITE_CRUSTDATA_KEY' },
  { name: 'S2', envKey: 'VITE_S2_TOKEN' },
]

function isKeyConfigured(envKey) {
  const value = import.meta.env[envKey]
  return !!value && !value.startsWith('your_')
}

export default function TopBar() {
  const { pipelineStatus } = useAppContext()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b-2 border-black">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.png" alt="Sprint It" className="w-8 h-8 rounded" />
            <span className="text-lg font-bold tracking-tight text-black">SPRINT IT</span>
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon, stageKey }) => {
              const isComplete = stageKey && pipelineStatus[stageKey] === 'complete'
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-purple text-white'
                        : 'text-black hover:bg-neutral-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} strokeWidth={2} />
                      <span>{label}</span>
                      {isComplete && !isActive && (
                        <CheckCircle2 size={14} className="text-green-600" />
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Right side: connection dots */}
          <div className="hidden md:flex items-center gap-3">
            {connectedTools.map(({ name, envKey }) => (
              <div key={name} className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <div className={`w-2 h-2 rounded-full ${isKeyConfigured(envKey) ? 'bg-green-500' : 'bg-neutral-300'}`} />
                {name}
              </div>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-black"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-3 space-y-1">
            {navItems.map(({ to, label, icon: Icon, stageKey }) => {
              const isComplete = stageKey && pipelineStatus[stageKey] === 'complete'
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-semibold ${
                      isActive ? 'bg-purple text-white' : 'text-black'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {isComplete && <CheckCircle2 size={14} className="text-green-600 ml-auto" />}
                </NavLink>
              )
            })}
          </div>
        )}
      </header>

      {/* Purple accent line under nav — like the DeFAI purple bar */}
      <div className="h-1 bg-purple w-full" />
    </>
  )
}
