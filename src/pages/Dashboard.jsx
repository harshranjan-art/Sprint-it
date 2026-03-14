import {
  Upload,
  Brain,
  FileText,
  Users,
  Activity,
  TrendingUp,
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import ActivityFeed from '../components/ActivityFeed'

const statusColors = {
  pending: { dot: 'bg-gray-300', text: 'text-text-secondary', bg: 'bg-gray-50' },
  active: { dot: 'bg-amber', text: 'text-amber-700', bg: 'bg-amber-50' },
  complete: { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
}

const statusLabels = {
  pending: 'Pending',
  active: 'Running',
  complete: 'Complete',
}

export default function Dashboard() {
  const { pipelineStatus, feedbackData, eventLog, teamAssignments } = useAppContext()

  const stages = [
    {
      title: 'Data Ingestion',
      description: 'Ingest feedback from multiple sources — surveys, support tickets, interviews, and more.',
      icon: Upload,
      statusKey: 'ingest',
      metric: `${feedbackData.length} entries`,
    },
    {
      title: 'AI Analysis',
      description: 'Discover themes, uncover gaps, and generate prioritized recommendations.',
      icon: Brain,
      statusKey: 'analysis',
      metric: '0 themes found',
    },
    {
      title: 'Document Generation',
      description: 'Auto-generate PRDs, OKRs, one-pagers, and experiment specs from analysis.',
      icon: FileText,
      statusKey: 'docs',
      metric: '0 docs generated',
    },
    {
      title: 'Team Assignment',
      description: 'Assign work to engineers based on skills, capacity, and priorities.',
      icon: Users,
      statusKey: 'assign',
      metric: `${teamAssignments.length} assignments`,
    },
  ]

  return (
    <div className="flex gap-6">
      {/* Left column — 60% */}
      <div className="w-[60%]">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-bg-card rounded-2xl border border-border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-light flex items-center justify-center">
                <Activity size={16} className="text-purple" />
              </div>
              <span className="text-xs font-medium text-text-secondary">Events</span>
            </div>
            <p className="text-xl font-semibold">{eventLog.length}</p>
          </div>
          <div className="bg-bg-card rounded-2xl border border-border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-light flex items-center justify-center">
                <Upload size={16} className="text-purple" />
              </div>
              <span className="text-xs font-medium text-text-secondary">Feedback</span>
            </div>
            <p className="text-xl font-semibold">{feedbackData.length}</p>
          </div>
          <div className="bg-bg-card rounded-2xl border border-border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-light flex items-center justify-center">
                <TrendingUp size={16} className="text-purple" />
              </div>
              <span className="text-xs font-medium text-text-secondary">Complete</span>
            </div>
            <p className="text-xl font-semibold">
              {Object.values(pipelineStatus).filter((s) => s === 'complete').length}/4
            </p>
          </div>
        </div>

        {/* Pipeline stage cards */}
        <h2 className="text-base font-semibold mb-3">Pipeline Stages</h2>
        <div className="grid grid-cols-2 gap-4">
          {stages.map(({ title, description, icon: Icon, statusKey, metric }) => {
            const status = pipelineStatus[statusKey]
            const colors = statusColors[status]
            return (
              <div
                key={statusKey}
                className="bg-bg-card rounded-2xl border border-border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-light flex items-center justify-center">
                    <Icon size={18} className="text-purple" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    {statusLabels[status]}
                  </span>
                </div>
                <h3 className="text-sm font-semibold mb-1">{title}</h3>
                <p className="text-xs text-text-secondary mb-3 leading-relaxed">{description}</p>
                <div className="mt-auto pt-2.5 border-t border-border">
                  <span className="text-xs text-text-secondary">{metric}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right column — 40% */}
      <div className="w-[40%]">
        <ActivityFeed />
      </div>
    </div>
  )
}
