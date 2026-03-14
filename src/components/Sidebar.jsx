import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  Brain,
  FileText,
  Users,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ingest', label: 'Ingest Data', icon: Upload },
  { to: '/analysis', label: 'Analysis', icon: Brain },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/assignments', label: 'Assignments', icon: Users },
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
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-border h-screen flex flex-col sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="w-9 h-9 rounded-full bg-purple flex items-center justify-center">
          <span className="text-white font-bold text-lg leading-none">S</span>
        </div>
        <span className="text-xl font-bold text-text-primary">Sprint It</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
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
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
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
    </aside>
  )
}
