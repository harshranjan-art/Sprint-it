import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Database,
  Lightbulb,
  FileText,
  CheckCircle2,
  ArrowRight,
  Clock,
  Zap,
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { useCountUp } from '../hooks/useCountUp'
import ActivityFeed from '../components/ActivityFeed'
import PipelineOverlay from '../components/PipelineOverlay'
import { runFullPipeline } from '../services/pipelineRunner'

// ─── Status helpers ─────────────────────────────────────────────────────────

const statusStyles = {
  pending: { badge: 'bg-gray-50 text-text-secondary', dot: 'bg-gray-300' },
  active: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber' },
  complete: { badge: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
}

const statusLabels = { pending: 'Pending', active: 'Running', complete: 'Complete' }

const accentColors = ['border-t-teal-500', 'border-t-purple', 'border-t-amber', 'border-t-blue-500']

// ─── Animated number ────────────────────────────────────────────────────────

function AnimatedNumber({ value }) {
  const display = useCountUp(value)
  return <>{display}</>
}

// ─── Skeleton placeholder ───────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const {
    pipelineStatus,
    feedbackData,
    analysisResults,
    generatedDocs,
    teamAssignments,
    eventLog,
    updateState,
    updatePipelineStatus,
    addEvent,
  } = useAppContext()
  const navigate = useNavigate()
  const { addToast } = useToast()

  // Pipeline overlay state
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [pipelineStep, setPipelineStep] = useState(0)
  const [pipelineError, setPipelineError] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  // Timer for overlay
  useEffect(() => {
    if (!pipelineRunning) return
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [pipelineRunning])

  // Computed stats
  const themes = analysisResults.themes || []
  const recommendations = analysisResults.recommendations || []
  const topRec = recommendations[0] || null

  const docCount = useMemo(() => {
    let count = 0
    Object.values(generatedDocs).forEach((featureDocs) => {
      if (featureDocs && typeof featureDocs === 'object') {
        count += Object.keys(featureDocs).length
      }
    })
    return count
  }, [generatedDocs])

  const docTypes = useMemo(() => {
    const types = new Set()
    Object.values(generatedDocs).forEach((featureDocs) => {
      if (featureDocs && typeof featureDocs === 'object') {
        Object.keys(featureDocs).forEach((t) => types.add(t))
      }
    })
    return Array.from(types)
  }, [generatedDocs])

  // Time saved calculation
  const timeSaved = useMemo(() => {
    const firstDataEvent = eventLog.find((e) => e.type === 'data_ingested')
    const lastAssignEvent = [...eventLog].reverse().find((e) => e.type === 'task_assigned')
    if (!firstDataEvent || !lastAssignEvent) return null
    const ms = new Date(lastAssignEvent.timestamp) - new Date(firstDataEvent.timestamp)
    const secs = Math.round(ms / 1000)
    const mins = Math.floor(secs / 60)
    const remSecs = secs % 60
    return `${mins}m ${remSecs}s`
  }, [eventLog])

  // Pipeline stages for display
  const stages = [
    {
      title: 'Data Ingested',
      icon: Database,
      stageKey: 'ingest',
      stat: feedbackData.length,
      detail: feedbackData.length > 0 ? `${feedbackData.length} entries loaded` : 'No data yet',
    },
    {
      title: 'Themes Found',
      icon: Lightbulb,
      stageKey: 'analysis',
      stat: themes.length,
      detail: themes.length > 0 ? themes[0]?.name : 'Run analysis to discover',
    },
    {
      title: 'Docs Generated',
      icon: FileText,
      stageKey: 'docs',
      stat: docCount,
      detail: docTypes.length > 0 ? docTypes.map((t) => t.toUpperCase()).join(', ') : 'No docs yet',
    },
    {
      title: 'Tasks Assigned',
      icon: CheckCircle2,
      stageKey: 'assign',
      stat: teamAssignments.length,
      detail: teamAssignments.length > 0
        ? teamAssignments.map((a) => a.assignee).join(', ')
        : 'No assignments yet',
    },
  ]

  // ── Run Full Pipeline ──

  const handleRunPipeline = useCallback(async () => {
    setPipelineRunning(true)
    setPipelineStep(0)
    setPipelineError(null)
    setElapsed(0)

    try {
      await runFullPipeline(
        (step) => setPipelineStep(step),
        addEvent,
        updateState,
        updatePipelineStatus
      )
      addToast('Full pipeline complete!', 'success')
    } catch (err) {
      setPipelineError(err.message)
      addToast(`Pipeline failed: ${err.message}`, 'error', 5000)
    } finally {
      setPipelineRunning(false)
    }
  }, [addEvent, updateState, updatePipelineStatus, addToast])

  const allComplete = Object.values(pipelineStatus).every((s) => s === 'complete')

  return (
    <div className="space-y-6">
      {/* Pipeline overlay */}
      {pipelineRunning && (
        <PipelineOverlay step={pipelineStep} elapsed={elapsed} error={pipelineError} />
      )}

      {/* ── Hero Section ── */}
      <div className="bg-bg-card rounded-2xl border border-border p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-[fadeIn_0.3s_ease-out]">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Welcome to Sprint It</h1>
          <p className="text-sm text-text-secondary mb-6">
            Your AI product management agent — ingests data, discovers themes, decides what to build,
            writes specs, and assigns work.
          </p>
          <button
            onClick={handleRunPipeline}
            disabled={pipelineRunning || allComplete}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition-colors disabled:opacity-50 shadow-[0_2px_8px_rgba(124,107,240,0.3)] mb-4"
          >
            <Sparkles size={18} />
            {allComplete ? 'Pipeline Complete' : pipelineRunning ? 'Running...' : 'Run Full Pipeline'}
            {!allComplete && !pipelineRunning && <ArrowRight size={16} />}
          </button>
          <p className="text-xs text-text-secondary/60">
            Ingests data &rarr; Discovers themes &rarr; Decides what to build &rarr; Writes specs &rarr; Assigns work
          </p>
        </div>
      </div>

      {/* ── Pipeline Status Row ── */}
      <div className="grid grid-cols-4 max-md:grid-cols-2 gap-4">
        {stages.map(({ title, icon: Icon, stageKey, stat, detail }, i) => {
          const status = pipelineStatus[stageKey]
          const styles = statusStyles[status]
          return (
            <div
              key={stageKey}
              className={`bg-bg-card rounded-2xl border border-border border-t-3 ${accentColors[i]} p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-[fadeIn_0.3s_ease-out] stagger-${i + 1}`}
              style={{ animationFillMode: 'both' }}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon size={20} className="text-text-secondary" />
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                  {statusLabels[status]}
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary mb-0.5">
                <AnimatedNumber value={stat} />
              </p>
              <p className="text-xs text-text-secondary">{title}</p>
              <p className="text-[10px] text-text-secondary/70 mt-1 truncate">{detail}</p>
            </div>
          )
        })}
      </div>

      {/* ── Two Columns: Latest Recommendation + Activity Feed ── */}
      <div className="flex gap-6 max-md:flex-col">
        {/* Left: Latest Recommendation */}
        <div className="w-[55%] max-md:w-full">
          {topRec ? (
            <div className="bg-bg-card rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary">Top Recommendation</h2>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-light text-purple">
                  #{topRec.rank || 1} Priority
                </span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">{topRec.feature_name}</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">{topRec.description}</p>

              {/* Score bars */}
              <div className="space-y-2 mb-5">
                {[
                  { label: 'User Impact', value: topRec.user_impact },
                  { label: 'Revenue', value: topRec.revenue_impact },
                  { label: 'Strategic', value: topRec.strategic_alignment },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary w-20">{label}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple rounded-full transition-all duration-500"
                        style={{ width: `${(value / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium w-5 text-right">{value}</span>
                  </div>
                ))}
              </div>

              {topRec.rationale && (
                <p className="text-xs text-text-secondary leading-relaxed border-t border-border pt-3 mb-4">
                  {topRec.rationale}
                </p>
              )}

              <button
                onClick={() => navigate('/analysis')}
                className="flex items-center gap-1.5 text-sm font-medium text-purple hover:text-purple/80 transition-colors"
              >
                View Details <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="bg-bg-card rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full flex flex-col items-center justify-center text-center">
              <Lightbulb size={32} className="text-text-secondary/20 mb-3" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">No Recommendations Yet</h3>
              <p className="text-xs text-text-secondary mb-4">
                Run the full pipeline or complete analysis to see what to build next.
              </p>
              <button
                onClick={() => navigate('/ingest')}
                className="flex items-center gap-1.5 text-sm font-medium text-purple hover:text-purple/80 transition-colors"
              >
                Start with Ingest Data <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Right: Activity Feed */}
        <div className="w-[45%] max-md:w-full">
          <ActivityFeed />
        </div>
      </div>

      {/* ── Time Saved ── */}
      {timeSaved && (
        <div className="bg-gradient-to-r from-purple to-purple/80 rounded-2xl p-6 shadow-[0_2px_8px_rgba(124,107,240,0.3)] animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Time Saved</h3>
              <p className="text-sm text-white/80">
                This analysis would take a PM team ~40 hours. Sprint It did it in{' '}
                <span className="font-bold text-white">{timeSaved}</span>.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Clock size={16} className="text-white/60" />
              <span className="text-2xl font-bold text-white">{timeSaved}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
