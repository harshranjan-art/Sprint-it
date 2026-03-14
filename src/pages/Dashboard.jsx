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

const statusLabels = { pending: 'Pending', active: 'Running', complete: 'Done' }
const statusColors = {
  pending: 'bg-neutral-100 text-neutral-500',
  active: 'bg-gold/20 text-amber-700',
  complete: 'bg-green-50 text-green-700',
}

function AnimatedNumber({ value }) {
  const display = useCountUp(value)
  return <>{display}</>
}

export default function Dashboard() {
  const {
    pipelineStatus, feedbackData, analysisResults, generatedDocs,
    teamAssignments, eventLog, updateState, updatePipelineStatus, addEvent,
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
    Object.values(generatedDocs).forEach((fd) => {
      if (fd && typeof fd === 'object') count += Object.keys(fd).length
    })
    return count
  }, [generatedDocs])

  const timeSaved = useMemo(() => {
    const first = eventLog.find((e) => e.type === 'data_ingested')
    const last = [...eventLog].reverse().find((e) => e.type === 'task_assigned')
    if (!first || !last) return null
    const secs = Math.round((new Date(last.timestamp) - new Date(first.timestamp)) / 1000)
    return `${Math.floor(secs / 60)}m ${secs % 60}s`
  }, [eventLog])

  const stages = [
    { title: 'Data Ingested', icon: Database, stageKey: 'ingest', stat: feedbackData.length },
    { title: 'Themes Found', icon: Lightbulb, stageKey: 'analysis', stat: themes.length },
    { title: 'Docs Generated', icon: FileText, stageKey: 'docs', stat: docCount },
    { title: 'Tasks Assigned', icon: CheckCircle2, stageKey: 'assign', stat: teamAssignments.length },
  ]

  const handleRunPipeline = useCallback(async () => {
    setPipelineRunning(true)
    setPipelineStep(0)
    setPipelineError(null)
    setElapsed(0)
    try {
      await runFullPipeline(
        (step) => setPipelineStep(step),
        addEvent, updateState, updatePipelineStatus
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
    <div className="space-y-10">
      {pipelineRunning && (
        <PipelineOverlay step={pipelineStep} elapsed={elapsed} error={pipelineError} />
      )}

      {/* ── HERO — bold statement like DeFAI ── */}
      <div className="text-center py-10 max-md:py-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Sprint It" className="w-16 h-16 rounded-xl" />
        </div>
        <h1 className="text-5xl max-md:text-3xl font-black tracking-tight leading-tight text-black mb-4">
          <span className="text-purple">40 HOURS</span> OF PM WORK.
          <br />
          <span className="bg-gold text-black px-3 py-1 inline-block mt-1">90 SECONDS.</span>
        </h1>
        <p className="text-lg text-text-secondary max-w-xl mx-auto mb-8">
          Your entire product cycle, on autopilot — from feedback to shipped, without the meetings.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleRunPipeline}
            disabled={pipelineRunning || allComplete}
            className="flex items-center gap-2 px-8 py-3.5 bg-purple text-white text-sm font-bold uppercase tracking-wider rounded-none hover:bg-purple/90 transition-colors disabled:opacity-40"
          >
            <Sparkles size={18} />
            {allComplete ? 'PIPELINE COMPLETE' : pipelineRunning ? 'RUNNING...' : 'RUN FULL PIPELINE'}
          </button>
          {!allComplete && !pipelineRunning && (
            <button
              onClick={() => navigate('/ingest')}
              className="px-8 py-3.5 bg-black text-white text-sm font-bold uppercase tracking-wider rounded-none hover:bg-black/80 transition-colors"
            >
              STEP BY STEP
            </button>
          )}
        </div>
      </div>

      {/* ── Pipeline Status — 4 bold stat cards ── */}
      <div className="grid grid-cols-4 max-md:grid-cols-2 gap-4">
        {stages.map(({ title, icon: Icon, stageKey, stat }, i) => {
          const status = pipelineStatus[stageKey]
          return (
            <div
              key={stageKey}
              className={`border-2 border-black p-5 animate-[fadeIn_0.3s_ease-out] stagger-${i + 1}`}
              style={{ animationFillMode: 'both' }}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon size={20} className="text-purple" />
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 ${statusColors[status]}`}>
                  {statusLabels[status]}
                </span>
              </div>
              <p className="text-4xl font-black text-black">
                <AnimatedNumber value={stat} />
              </p>
              <p className="text-sm font-medium text-text-secondary mt-1">{title}</p>
            </div>
          )
        })}
      </div>

      {/* ── Two columns: Top Recommendation + Activity Feed ── */}
      <div className="flex gap-6 max-md:flex-col">
        <div className="w-[55%] max-md:w-full">
          {topRec ? (
            <div className="border-2 border-black p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Top Recommendation</h2>
                <span className="bg-purple text-white text-xs font-bold px-2.5 py-1">
                  #{topRec.rank || 1}
                </span>
              </div>
              <h3 className="text-xl font-black text-black mb-2">{topRec.feature_name}</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">{topRec.description}</p>

              <div className="space-y-2 mb-5">
                {[
                  { label: 'User Impact', value: topRec.user_impact },
                  { label: 'Revenue', value: topRec.revenue_impact },
                  { label: 'Strategic', value: topRec.strategic_alignment },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-text-secondary w-20">{label}</span>
                    <div className="flex-1 h-2 bg-neutral-100 overflow-hidden">
                      <div
                        className="h-full bg-purple transition-all duration-500"
                        style={{ width: `${(value / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold w-5 text-right">{value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/analysis')}
                className="flex items-center gap-2 text-sm font-bold text-purple hover:text-purple/70 transition-colors uppercase tracking-wider"
              >
                View Details <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="border-2 border-neutral-200 border-dashed p-8 h-full flex flex-col items-center justify-center text-center">
              <Lightbulb size={32} className="text-neutral-300 mb-3" />
              <h3 className="text-sm font-bold text-black mb-1">No Recommendations Yet</h3>
              <p className="text-sm text-text-secondary mb-4">
                Run the pipeline to see what to build next.
              </p>
              <button
                onClick={() => navigate('/ingest')}
                className="text-sm font-bold text-purple uppercase tracking-wider"
              >
                Get Started <ArrowRight size={14} className="inline ml-1" />
              </button>
            </div>
          )}
        </div>

        <div className="w-[45%] max-md:w-full">
          <ActivityFeed />
        </div>
      </div>

      {/* ── Time Saved ── */}
      {timeSaved && (
        <div className="bg-gold p-6 flex items-center justify-between animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center gap-4">
            <Zap size={24} className="text-black" />
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-black">Time Saved</p>
              <p className="text-sm text-black/70">
                A PM team takes ~40 hours. Sprint It did it in <span className="font-black">{timeSaved}</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-black/50" />
            <span className="text-3xl font-black text-black">{timeSaved}</span>
          </div>
        </div>
      )}
    </div>
  )
}
