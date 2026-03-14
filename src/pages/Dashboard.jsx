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

const statusStyles = {
  pending: { badge: 'bg-white/5 text-text-secondary', dot: 'bg-white/20' },
  active: { badge: 'bg-amber/10 text-amber', dot: 'bg-amber' },
  complete: { badge: 'bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
}

const statusLabels = { pending: 'Pending', active: 'Running', complete: 'Complete' }

const accentColors = ['border-t-teal-500', 'border-t-purple', 'border-t-amber', 'border-t-blue-400']

function AnimatedNumber({ value }) {
  const display = useCountUp(value)
  return <>{display}</>
}

function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

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

  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [pipelineStep, setPipelineStep] = useState(0)
  const [pipelineError, setPipelineError] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!pipelineRunning) return
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [pipelineRunning])

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
    <div data-testid="dashboard-page" className="space-y-5">
      {pipelineRunning && (
        <PipelineOverlay step={pipelineStep} elapsed={elapsed} error={pipelineError} />
      )}

      <div className="bg-bg-card rounded-xl border border-border p-7 card-glow animate-[fadeIn_0.3s_ease-out]">
        <div className="max-w-2xl">
          <h1 className="text-xl font-bold text-text-primary mb-1 tracking-tight">Welcome to Sprint It</h1>
          <p className="text-[13px] text-text-secondary mb-5 leading-relaxed">
            Your AI product management agent — ingests data, discovers themes, decides what to build,
            writes specs, and assigns work.
          </p>
          <button
            data-testid="run-pipeline-btn"
            onClick={handleRunPipeline}
            disabled={pipelineRunning || allComplete}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple text-white text-[13px] font-semibold hover:bg-purple/90 transition-all disabled:opacity-40 glow-btn mb-3"
          >
            <Sparkles size={16} />
            {allComplete ? 'Pipeline Complete' : pipelineRunning ? 'Running...' : 'Run Full Pipeline'}
            {!allComplete && !pipelineRunning && <ArrowRight size={14} />}
          </button>
          <p className="text-[11px] text-text-secondary/50 font-mono">
            Ingest &rarr; Themes &rarr; Build &rarr; Specs &rarr; Assign
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 max-md:grid-cols-2 gap-3">
        {stages.map(({ title, icon: Icon, stageKey, stat, detail }, i) => {
          const status = pipelineStatus[stageKey]
          const styles = statusStyles[status]
          return (
            <div
              key={stageKey}
              data-testid={`stage-card-${stageKey}`}
              className={`bg-bg-card rounded-xl border border-border border-t-2 ${accentColors[i]} p-4 card-glow animate-[fadeIn_0.3s_ease-out] stagger-${i + 1}`}
              style={{ animationFillMode: 'both' }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <Icon size={18} className="text-text-secondary" />
                <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-md ${styles.badge}`}>
                  <span className={`w-1 h-1 rounded-full ${styles.dot}`} />
                  {statusLabels[status]}
                </span>
              </div>
              <p className="text-xl font-bold text-text-primary mb-0.5 font-mono">
                <AnimatedNumber value={stat} />
              </p>
              <p className="text-[11px] text-text-secondary">{title}</p>
              <p className="text-[10px] text-text-secondary/50 mt-0.5 truncate">{detail}</p>
            </div>
          )
        })}
      </div>

      <div className="flex gap-5 max-md:flex-col">
        <div className="w-[55%] max-md:w-full">
          {topRec ? (
            <div className="bg-bg-card rounded-xl border border-border p-5 card-glow h-full animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-semibold text-text-primary">Top Recommendation</h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple/10 text-purple">
                  #{topRec.rank || 1} Priority
                </span>
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1.5">{topRec.feature_name}</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed mb-3">{topRec.description}</p>

              <div className="space-y-1.5 mb-4">
                {[
                  { label: 'User Impact', value: topRec.user_impact },
                  { label: 'Revenue', value: topRec.revenue_impact },
                  { label: 'Strategic', value: topRec.strategic_alignment },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary w-16">{label}</span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple rounded-full transition-all duration-500 shadow-[0_0_4px_rgba(139,124,246,0.3)]"
                        style={{ width: `${(value / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium w-5 text-right font-mono">{value}</span>
                  </div>
                ))}
              </div>

              {topRec.rationale && (
                <p className="text-[11px] text-text-secondary leading-relaxed border-t border-border pt-3 mb-3">
                  {topRec.rationale}
                </p>
              )}

              <button
                data-testid="view-analysis-link"
                onClick={() => navigate('/analysis')}
                className="flex items-center gap-1.5 text-[13px] font-medium text-purple hover:text-purple/80 transition-colors"
              >
                View Details <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <div className="bg-bg-card rounded-xl border border-border p-5 card-glow h-full flex flex-col items-center justify-center text-center">
              <Lightbulb size={28} className="text-text-secondary/15 mb-3" />
              <h3 className="text-[13px] font-semibold text-text-primary mb-1">No Recommendations Yet</h3>
              <p className="text-[11px] text-text-secondary mb-3">
                Run the full pipeline or complete analysis to see what to build next.
              </p>
              <button
                data-testid="start-ingest-link"
                onClick={() => navigate('/ingest')}
                className="flex items-center gap-1.5 text-[13px] font-medium text-purple hover:text-purple/80 transition-colors"
              >
                Start with Ingest Data <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>

        <div className="w-[45%] max-md:w-full">
          <ActivityFeed />
        </div>
      </div>

      {timeSaved && (
        <div className="bg-purple/10 border border-purple/20 rounded-xl p-5 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple/20 border border-purple/30 flex items-center justify-center">
              <Zap size={20} className="text-purple" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">Time Saved</h3>
              <p className="text-[13px] text-text-secondary">
                This analysis would take a PM team ~40 hours. Sprint It did it in{' '}
                <span className="font-bold text-purple font-mono">{timeSaved}</span>.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Clock size={14} className="text-text-secondary" />
              <span className="text-xl font-bold text-purple font-mono">{timeSaved}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
