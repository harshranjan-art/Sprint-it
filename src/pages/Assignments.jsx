import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  X,
  RefreshCw,
  Target,
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { engineers as initialEngineers } from '../data/mockTeam'
import { autoAssign } from '../services/assignmentService'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase()
}

function loadColor(pct) {
  if (pct >= 75) return 'bg-red-500'
  if (pct >= 50) return 'bg-amber'
  return 'bg-green-500'
}

function loadTextColor(pct) {
  if (pct >= 75) return 'text-red-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-green-600'
}

const priorityStyles = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-amber-100 text-amber-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-text-secondary',
}

// ─── Engineer Card ──────────────────────────────────────────────────────────

function EngineerCard({ eng, highlight }) {
  const loadPct = Math.min(eng.load, eng.max_capacity)

  return (
    <div className={`bg-bg-card rounded-2xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all ${
      highlight ? 'border-purple ring-2 ring-purple/10' : 'border-border'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ backgroundColor: eng.avatar_color }}
        >
          {getInitials(eng.name)}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-text-primary truncate">{eng.name}</h4>
          <p className="text-xs text-text-secondary">{eng.role}</p>
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1 mb-3">
        {eng.skills.map((s) => (
          <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-light text-purple">
            {s}
          </span>
        ))}
      </div>

      {/* Load bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-text-secondary">Workload</span>
          <span className={`text-[10px] font-semibold ${loadTextColor(loadPct)}`}>
            {loadPct}% loaded
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${loadColor(loadPct)}`}
            style={{ width: `${loadPct}%` }}
          />
        </div>
      </div>

      {/* Current tasks */}
      {eng.current_tasks.length > 0 && (
        <div>
          <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Current Tasks</p>
          <div className="space-y-0.5">
            {eng.current_tasks.map((t) => (
              <p key={t} className="text-xs text-text-secondary truncate">• {t}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Feature Assignment Card ────────────────────────────────────────────────

function FeatureRow({ rec, assignment, loading, onAssign }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleCopy = async () => {
    if (!assignment?.ticket) return
    const text = `${assignment.ticket.title}\n\n${assignment.ticket.description}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-bg-card rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-5">
        <span className="w-7 h-7 rounded-full bg-purple flex items-center justify-center text-xs font-bold text-white shrink-0">
          {rec.rank}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary truncate">{rec.feature_name}</h4>
          <p className="text-xs text-text-secondary mt-0.5">{rec.target_segment} · Score: {rec.priority_score || rec._score || '—'}</p>
        </div>
        {!assignment ? (
          <button
            onClick={onAssign}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple text-white text-sm font-medium hover:bg-purple/90 transition-colors disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {loading ? 'Assigning...' : 'Auto-Assign'}
          </button>
        ) : (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-sm font-medium text-purple hover:text-purple/80 transition-colors"
          >
            {expanded ? 'Collapse' : 'View Assignment'}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Expanded assignment details */}
      {assignment && expanded && (
        <div className="border-t border-border p-5 space-y-5">
          {/* Assignees */}
          <div className="grid grid-cols-2 gap-4">
            {/* Primary */}
            <div className="p-4 rounded-xl bg-purple-light/50 border border-purple/10">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: getEngineerColor(assignment.primary_assignee?.id) }}
                >
                  {getInitials(assignment.primary_assignee?.name || '??')}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-text-primary">{assignment.primary_assignee?.name}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple text-white">Primary</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{assignment.primary_assignee?.reason}</p>
            </div>

            {/* Support */}
            {assignment.supporting_engineer && (
              <div className="p-4 rounded-xl bg-gray-50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: getEngineerColor(assignment.supporting_engineer?.id) }}
                  >
                    {getInitials(assignment.supporting_engineer?.name || '??')}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-text-primary">{assignment.supporting_engineer?.name}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-200 text-text-secondary">Support</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{assignment.supporting_engineer?.reason}</p>
              </div>
            )}
          </div>

          {/* Estimates */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] text-text-secondary uppercase tracking-wider">Points</p>
              <p className="text-lg font-bold text-purple">{assignment.estimated_points}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-secondary uppercase tracking-wider">Sprints</p>
              <p className="text-lg font-bold text-text-primary">{assignment.estimated_sprints}</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-text-secondary uppercase tracking-wider">Timeline</p>
              <p className="text-xs text-text-primary leading-relaxed">{assignment.sprint_fit}</p>
            </div>
          </div>

          {/* Ticket Preview */}
          {assignment.ticket && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-purple" />
                  <span className="text-xs font-medium text-text-secondary">Ticket Preview</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {assignment.ticket.priority && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${priorityStyles[assignment.ticket.priority] || priorityStyles.medium}`}>
                      {assignment.ticket.priority}
                    </span>
                  )}
                  {(assignment.ticket.labels || []).map((l) => (
                    <span key={l} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-light text-purple">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <h5 className="text-sm font-semibold text-text-primary mb-2">{assignment.ticket.title}</h5>
                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{assignment.ticket.description}</p>
              </div>
              <div className="px-4 py-3 border-t border-border flex items-center gap-2">
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple text-white text-xs font-medium hover:bg-purple/90 transition-colors"
                  >
                    <ExternalLink size={12} />
                    Create in Linear
                  </button>
                  {showTooltip && (
                    <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap shadow-lg z-10">
                      Linear integration ready — connect via Settings
                      <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
                >
                  {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy Ticket'}
                </button>
              </div>
            </div>
          )}

          {/* Risks & Dependencies */}
          <div className="grid grid-cols-2 gap-4">
            {assignment.risks?.length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                <p className="text-[10px] font-medium text-red-700 uppercase tracking-wider mb-1.5">Risks</p>
                <ul className="space-y-1">
                  {assignment.risks.map((r, i) => (
                    <li key={i} className="text-xs text-red-600 leading-relaxed">• {r}</li>
                  ))}
                </ul>
              </div>
            )}
            {assignment.dependencies?.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wider mb-1.5">Dependencies</p>
                <ul className="space-y-1">
                  {assignment.dependencies.map((d, i) => (
                    <li key={i} className="text-xs text-amber-600 leading-relaxed">• {d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getEngineerColor(id) {
  const eng = initialEngineers.find((e) => e.id === id)
  return eng?.avatar_color || '#6B7280'
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function Assignments() {
  const {
    analysisResults,
    teamAssignments,
    updateState,
    updatePipelineStatus,
    addEvent,
  } = useAppContext()
  const navigate = useNavigate()

  const recommendations = analysisResults.recommendations || []
  const topRecs = recommendations.slice(0, 3)

  const [team, setTeam] = useState(initialEngineers.map((e) => ({ ...e })))
  const [assignments, setAssignments] = useState({}) // featureName -> assignment result
  const [loading, setLoading] = useState({}) // featureName -> true
  const [error, setError] = useState(null)

  // Get highlighted engineer IDs from assignments
  const highlightedIds = new Set()
  Object.values(assignments).forEach((a) => {
    if (a.primary_assignee?.id) highlightedIds.add(a.primary_assignee.id)
    if (a.supporting_engineer?.id) highlightedIds.add(a.supporting_engineer.id)
  })

  const handleAutoAssign = useCallback(async (rec) => {
    const featureName = rec.feature_name
    setLoading((prev) => ({ ...prev, [featureName]: true }))
    setError(null)

    try {
      const result = await autoAssign(
        rec,
        team,
        { themes: analysisResults.themes, gaps: analysisResults.gaps }
      )

      setAssignments((prev) => ({ ...prev, [featureName]: result }))

      // Update engineer load bars
      setTeam((prev) => {
        const updated = prev.map((e) => ({ ...e }))
        const primaryId = result.primary_assignee?.id
        const supportId = result.supporting_engineer?.id
        if (primaryId) {
          const eng = updated.find((e) => e.id === primaryId)
          if (eng) {
            eng.load = Math.min(eng.load + 18, 100)
            eng.current_tasks = [...eng.current_tasks, featureName]
          }
        }
        if (supportId) {
          const eng = updated.find((e) => e.id === supportId)
          if (eng) {
            eng.load = Math.min(eng.load + 10, 100)
            eng.current_tasks = [...eng.current_tasks, `Support: ${featureName}`]
          }
        }
        return updated
      })

      // Update global state
      const newAssignment = {
        feature: featureName,
        assignee: result.primary_assignee?.name,
        support: result.supporting_engineer?.name,
        points: result.estimated_points,
        sprints: result.estimated_sprints,
      }
      updateState({ teamAssignments: [...teamAssignments, newAssignment] })
      updatePipelineStatus('assign', 'complete')

      await addEvent('task_assigned', {
        feature: featureName,
        assignee: result.primary_assignee?.name,
        points: result.estimated_points,
        sprint: result.estimated_sprints,
      }, `Assigned "${featureName}" to ${result.primary_assignee?.name} (${result.estimated_points} pts)`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading((prev) => ({ ...prev, [featureName]: false }))
    }
  }, [team, analysisResults, teamAssignments, updateState, updatePipelineStatus, addEvent])

  if (recommendations.length === 0) {
    return (
      <div className="bg-bg-card rounded-2xl border border-border p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
        <Target size={40} className="mx-auto mb-4 text-text-secondary/30" />
        <h2 className="text-lg font-semibold mb-2">No Recommendations Yet</h2>
        <p className="text-sm text-text-secondary mb-5">
          Complete the AI Analysis to get feature recommendations for assignment.
        </p>
        <button
          onClick={() => navigate('/analysis')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple text-white text-sm font-medium hover:bg-purple/90 transition-colors"
        >
          Go to Analysis <ArrowRight size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Team Overview ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Engineering Team</h2>
            <p className="text-sm text-text-secondary mt-0.5">{team.length} engineers available</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> &lt;50%</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber" /> 50-75%</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> &gt;75%</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {team.map((eng) => (
            <EngineerCard
              key={eng.id}
              eng={eng}
              highlight={highlightedIds.has(eng.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Feature Assignments ── */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-1">Feature Assignment</h2>
        <p className="text-sm text-text-secondary mb-4">
          Click "Auto-Assign" to let AI match features to the best engineers
        </p>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 mb-4">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="space-y-4">
          {topRecs.map((rec) => (
            <FeatureRow
              key={rec.feature_name}
              rec={rec}
              assignment={assignments[rec.feature_name]}
              loading={loading[rec.feature_name]}
              onAssign={() => handleAutoAssign(rec)}
            />
          ))}
        </div>
      </div>

      {/* ── Summary ── */}
      {Object.keys(assignments).length > 0 && (
        <div className="bg-purple rounded-2xl p-6 shadow-[0_2px_8px_rgba(124,107,240,0.3)]">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">Sprint Plan Summary</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-3xl font-bold text-white">{Object.keys(assignments).length}</p>
              <p className="text-sm text-white/70">Features assigned</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">
                {Object.values(assignments).reduce((s, a) => s + (a.estimated_points || 0), 0)}
              </p>
              <p className="text-sm text-white/70">Total points</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{highlightedIds.size}</p>
              <p className="text-sm text-white/70">Engineers engaged</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
