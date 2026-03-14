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
  Target,
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { engineers as initialEngineers } from '../data/mockTeam'
import { autoAssign } from '../services/assignmentService'

function getInitials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase()
}

function loadColor(pct) {
  if (pct >= 75) return 'bg-red-400'
  if (pct >= 50) return 'bg-amber'
  return 'bg-emerald-400'
}

function loadTextColor(pct) {
  if (pct >= 75) return 'text-red-400'
  if (pct >= 50) return 'text-amber'
  return 'text-emerald-400'
}

const priorityStyles = {
  urgent: 'bg-red-500/15 text-red-400',
  high: 'bg-amber/15 text-amber',
  medium: 'bg-blue-400/15 text-blue-400',
  low: 'bg-white/5 text-text-secondary',
}

function EngineerCard({ eng, highlight }) {
  const loadPct = Math.min(eng.load, eng.max_capacity)

  return (
    <div data-testid={`engineer-card-${eng.id}`} className={`bg-bg-card rounded-lg border p-4 card-glow transition-all ${
      highlight ? 'border-purple/30 shadow-[0_0_16px_rgba(139,124,246,0.06)]' : 'border-border'
    }`}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0"
          style={{ backgroundColor: eng.avatar_color }}
        >
          {getInitials(eng.name)}
        </div>
        <div className="min-w-0">
          <h4 className="text-[13px] font-semibold text-text-primary truncate">{eng.name}</h4>
          <p className="text-[11px] text-text-secondary">{eng.role}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2.5">
        {eng.skills.map((s) => (
          <span key={s} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple/10 text-purple">
            {s}
          </span>
        ))}
      </div>

      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-text-secondary">Workload</span>
          <span className={`text-[10px] font-semibold font-mono ${loadTextColor(loadPct)}`}>
            {loadPct}%
          </span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${loadColor(loadPct)}`}
            style={{ width: `${loadPct}%` }}
          />
        </div>
      </div>

      {eng.current_tasks.length > 0 && (
        <div>
          <p className="text-[9px] text-text-secondary/60 uppercase tracking-widest mb-0.5">Current Tasks</p>
          <div className="space-y-0.5">
            {eng.current_tasks.map((t) => (
              <p key={t} className="text-[11px] text-text-secondary truncate">- {t}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
    <div data-testid={`feature-row-${rec.feature_name}`} className="bg-bg-card rounded-xl border border-border card-glow overflow-hidden">
      <div className="flex items-center gap-3.5 p-4">
        <span className="w-6 h-6 rounded-md bg-purple/20 border border-purple/30 flex items-center justify-center text-[11px] font-bold text-purple shrink-0 font-mono">
          {rec.rank}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-semibold text-text-primary truncate">{rec.feature_name}</h4>
          <p className="text-[11px] text-text-secondary mt-0.5">{rec.target_segment} -- Score: <span className="font-mono">{rec.priority_score || rec._score || '--'}</span></p>
        </div>
        {!assignment ? (
          <button
            data-testid={`auto-assign-${rec.feature_name}`}
            onClick={onAssign}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple text-white text-[12px] font-medium hover:bg-purple/90 transition-colors disabled:opacity-40 shrink-0 glow-btn"
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            {loading ? 'Assigning...' : 'Auto-Assign'}
          </button>
        ) : (
          <button
            data-testid={`view-assignment-${rec.feature_name}`}
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[12px] font-medium text-purple hover:text-purple/80 transition-colors"
          >
            {expanded ? 'Collapse' : 'View Assignment'}
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {assignment && expanded && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-purple/5 border border-purple/10">
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: getEngineerColor(assignment.primary_assignee?.id) }}
                >
                  {getInitials(assignment.primary_assignee?.name || '??')}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-text-primary">{assignment.primary_assignee?.name}</span>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-purple/20 text-purple">Primary</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">{assignment.primary_assignee?.reason}</p>
            </div>

            {assignment.supporting_engineer && (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: getEngineerColor(assignment.supporting_engineer?.id) }}
                  >
                    {getInitials(assignment.supporting_engineer?.name || '??')}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-text-primary">{assignment.supporting_engineer?.name}</span>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-white/8 text-text-secondary">Support</span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">{assignment.supporting_engineer?.reason}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-5">
            <div>
              <p className="text-[9px] text-text-secondary/60 uppercase tracking-widest">Points</p>
              <p className="text-lg font-bold text-purple font-mono">{assignment.estimated_points}</p>
            </div>
            <div>
              <p className="text-[9px] text-text-secondary/60 uppercase tracking-widest">Sprints</p>
              <p className="text-lg font-bold text-text-primary font-mono">{assignment.estimated_sprints}</p>
            </div>
            <div className="flex-1">
              <p className="text-[9px] text-text-secondary/60 uppercase tracking-widest">Timeline</p>
              <p className="text-[11px] text-text-primary/80 leading-relaxed">{assignment.sprint_fit}</p>
            </div>
          </div>

          {assignment.ticket && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="bg-white/[0.02] px-3.5 py-2 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm bg-purple" />
                  <span className="text-[10px] font-medium text-text-secondary">Ticket Preview</span>
                </div>
                <div className="flex items-center gap-1">
                  {assignment.ticket.priority && (
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md capitalize ${priorityStyles[assignment.ticket.priority] || priorityStyles.medium}`}>
                      {assignment.ticket.priority}
                    </span>
                  )}
                  {(assignment.ticket.labels || []).map((l) => (
                    <span key={l} className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-purple/10 text-purple">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-3.5">
                <h5 className="text-[13px] font-semibold text-text-primary mb-1.5">{assignment.ticket.title}</h5>
                <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">{assignment.ticket.description}</p>
              </div>
              <div className="px-3.5 py-2.5 border-t border-border flex items-center gap-1.5">
                <div className="relative">
                  <button
                    data-testid="create-linear-btn"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple text-white text-[11px] font-medium hover:bg-purple/90 transition-colors"
                  >
                    <ExternalLink size={11} />
                    Create in Linear
                  </button>
                  {showTooltip && (
                    <div className="absolute bottom-full left-0 mb-1.5 px-2.5 py-1 bg-bg-elevated text-text-primary text-[10px] rounded-md whitespace-nowrap shadow-lg border border-border z-10">
                      Linear integration ready -- connect via Settings
                      <div className="absolute top-full left-4 w-1.5 h-1.5 bg-bg-elevated rotate-45 -mt-0.5 border-r border-b border-border" />
                    </div>
                  )}
                </div>
                <button
                  data-testid="copy-ticket-btn"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.02] transition-colors"
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  {copied ? 'Copied' : 'Copy Ticket'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {assignment.risks?.length > 0 && (
              <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                <p className="text-[9px] font-medium text-red-400 uppercase tracking-widest mb-1">Risks</p>
                <ul className="space-y-0.5">
                  {assignment.risks.map((r, i) => (
                    <li key={i} className="text-[11px] text-red-400/80 leading-relaxed">- {r}</li>
                  ))}
                </ul>
              </div>
            )}
            {assignment.dependencies?.length > 0 && (
              <div className="p-2.5 rounded-lg bg-amber/5 border border-amber/10">
                <p className="text-[9px] font-medium text-amber uppercase tracking-widest mb-1">Dependencies</p>
                <ul className="space-y-0.5">
                  {assignment.dependencies.map((d, i) => (
                    <li key={i} className="text-[11px] text-amber/80 leading-relaxed">- {d}</li>
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
  const [assignments, setAssignments] = useState({})
  const [loading, setLoading] = useState({})
  const [error, setError] = useState(null)

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
      <div className="bg-bg-card rounded-xl border border-border p-10 text-center">
        <Target size={36} className="mx-auto mb-3 text-text-secondary/15" />
        <h2 className="text-base font-semibold mb-1.5 text-text-primary">No Recommendations Yet</h2>
        <p className="text-[13px] text-text-secondary mb-4">
          Complete the AI Analysis to get feature recommendations for assignment.
        </p>
        <button
          data-testid="goto-analysis-from-assign"
          onClick={() => navigate('/analysis')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-[13px] font-medium hover:bg-purple/90 transition-colors glow-btn"
        >
          Go to Analysis <ArrowRight size={14} />
        </button>
      </div>
    )
  }

  return (
    <div data-testid="assignments-page" className="space-y-7">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[14px] font-semibold text-text-primary">Engineering Team</h2>
            <p className="text-[13px] text-text-secondary mt-0.5"><span className="font-mono">{team.length}</span> engineers available</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-text-secondary">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> &lt;50%</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber" /> 50-75%</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> &gt;75%</span>
          </div>
        </div>
        <div className="grid grid-cols-3 max-md:grid-cols-1 gap-3">
          {team.map((eng) => (
            <EngineerCard
              key={eng.id}
              eng={eng}
              highlight={highlightedIds.has(eng.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-[14px] font-semibold text-text-primary mb-0.5">Feature Assignment</h2>
        <p className="text-[13px] text-text-secondary mb-3">
          Click "Auto-Assign" to let AI match features to the best engineers
        </p>

        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
            <AlertTriangle size={14} className="text-red-400 shrink-0" />
            <p className="text-[13px] text-red-400 flex-1">{error}</p>
            <button data-testid="dismiss-error" onClick={() => setError(null)} className="text-red-500/30 hover:text-red-400 transition-colors">
              <X size={13} />
            </button>
          </div>
        )}

        <div className="space-y-3">
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

      {Object.keys(assignments).length > 0 && (
        <div data-testid="sprint-summary" className="bg-purple/10 border border-purple/20 rounded-xl p-5">
          <h3 className="text-[10px] font-semibold text-purple uppercase tracking-widest mb-3">Sprint Plan Summary</h3>
          <div className="grid grid-cols-3 gap-5">
            <div>
              <p className="text-2xl font-bold text-text-primary font-mono">{Object.keys(assignments).length}</p>
              <p className="text-[13px] text-text-secondary">Features assigned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary font-mono">
                {Object.values(assignments).reduce((s, a) => s + (a.estimated_points || 0), 0)}
              </p>
              <p className="text-[13px] text-text-secondary">Total points</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary font-mono">{highlightedIds.size}</p>
              <p className="text-[13px] text-text-secondary">Engineers engaged</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
