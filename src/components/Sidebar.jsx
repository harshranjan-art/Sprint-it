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
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-purple flex items-center justify-center">
            <span className="text-white font-bold text-lg leading-none">S</span>
          </div>
          <span className="text-xl font-bold text-text-primary">Sprint It</span>
        </div>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-text-secondary hover:text-text-primary"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2">
        {navItems.map(({ to, label, icon: Icon, stageKey }) => {
          const isComplete = stageKey && pipelineStatus[stageKey] === 'complete'
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative mb-1 ${
                  isActive
                    ? 'bg-purple-light text-purple'
                    : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-purple rounded-r-full" />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                  <span className="flex-1">{label}</span>
                  {isComplete && (
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Connected Tools */}
      <div className="px-4 pb-6">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3 px-2">
          Connected Tools
        </p>
        <div className="space-y-2">
          {connectedTools.map(({ name, envKey }) => {
            const connected = isKeyConfigured(envKey)
            return (
              <div
                key={name}
                className="flex items-center gap-2.5 px-2 py-1.5 text-sm text-text-secondary"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    connected ? 'bg-green-500' : 'bg-gray-300'
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
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 w-10 h-10 rounded-xl bg-white border border-border shadow flex items-center justify-center"
      >
        <Menu size={20} className="text-text-primary" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible, mobile: slide-in */}
      <aside
        className={`
          bg-white border-r border-border h-screen flex flex-col sticky top-0 z-50
          w-60 shrink-0
          max-md:fixed max-md:left-0 max-md:top-0 max-md:transition-transform max-md:duration-200
          ${mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
