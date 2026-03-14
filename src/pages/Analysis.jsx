import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  ChevronDown,
  ChevronUp,
  Quote,
  Shield,
  Target,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  ArrowRight,
  FileText,
  Loader2,
  RefreshCw,
  X,
  SlidersHorizontal,
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { discoverThemes, analyzeGaps, generateRecommendations } from '../services/analysisService'

const STEPS = [
  { key: 'themes', label: 'Discovering themes...' },
  { key: 'gaps', label: 'Analyzing competitive gaps...' },
  { key: 'recs', label: 'Generating recommendations...' },
]

const severityColors = {
  critical: { border: 'border-l-red-400', bg: 'bg-red-500/10', text: 'text-red-400' },
  high: { border: 'border-l-amber', bg: 'bg-amber/10', text: 'text-amber' },
  medium: { border: 'border-l-blue-400', bg: 'bg-blue-400/10', text: 'text-blue-400' },
  low: { border: 'border-l-white/15', bg: 'bg-white/5', text: 'text-text-secondary' },
}

const categoryLabels = {
  feature_gap: 'Feature Gap',
  bug: 'Bug',
  ux_friction: 'UX Friction',
  competitive_pressure: 'Competitive',
  praise: 'Praise',
}

const statusDotColors = {
  strong: 'bg-emerald-400',
  building: 'bg-amber',
  weak: 'bg-red-400',
  missing: 'bg-white/15',
}

const DEFAULT_WEIGHTS = { userImpact: 25, revenueImpact: 25, effort: 25, strategicAlignment: 25 }

function computeScore(rec, w) {
  const totalW = w.userImpact + w.revenueImpact + w.effort + w.strategicAlignment
  if (totalW === 0) return 0
  const raw =
    (rec.user_impact * w.userImpact +
      rec.revenue_impact * w.revenueImpact +
      (10 - rec.effort) * w.effort +
      rec.strategic_alignment * w.strategicAlignment) /
    totalW *
    10
  return Math.round(raw * 10) / 10
}

function ProgressStepper({ currentStep, error }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {STEPS.map((step, i) => {
        const isActive = i === currentStep
        const isDone = i < currentStep
        const isFailed = isActive && error
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold transition-colors ${
                  isFailed
                    ? 'bg-red-500/15 text-red-400'
                    : isDone
                      ? 'bg-purple/20 text-purple border border-purple/30'
                      : isActive
                        ? 'bg-amber/20 text-amber border border-amber/30'
                        : 'bg-white/5 text-text-secondary'
                }`}
              >
                {isDone ? '>' : i + 1}
              </div>
              <span
                className={`text-[12px] ${
                  isActive ? 'text-text-primary font-medium' : 'text-text-secondary'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        )
      })}
    </div>
  )
}

function PulsingBar() {
  return (
    <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden mb-5">
      <div className="h-full w-1/3 bg-purple rounded-full animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_8px_rgba(139,124,246,0.4)]" />
    </div>
  )
}

function Toast({ message, onRetry, onDismiss }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-5">
      <AlertTriangle size={16} className="text-red-400 shrink-0" />
      <p className="text-[13px] text-red-400 flex-1">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-[12px] font-medium text-red-400 hover:text-red-300 px-2.5 py-1 rounded-md bg-red-500/15 hover:bg-red-500/20 transition-colors"
      >
        <RefreshCw size={12} /> Retry
      </button>
      <button onClick={onDismiss} className="text-red-500/40 hover:text-red-400 transition-colors">
        <X size={14} />
      </button>
    </div>
  )
}

function WeightSlider({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-text-secondary w-28 shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 cursor-pointer"
      />
      <span className="text-[11px] font-medium text-text-primary w-6 text-right font-mono">{value}</span>
    </div>
  )
}

function ThemeCard({ theme }) {
  const [expanded, setExpanded] = useState(false)
  const colors = severityColors[theme.severity] || severityColors.low

  return (
    <div className={`bg-bg-card rounded-lg border border-border border-l-2 ${colors.border} p-4 card-glow`}>
      <div className="flex items-start justify-between mb-1.5">
        <h4 className="text-[13px] font-semibold text-text-primary leading-snug pr-2">{theme.name}</h4>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${colors.bg} ${colors.text} capitalize`}>
            {theme.severity}
          </span>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-purple/10 text-purple font-mono">
            {theme.frequency}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-text-secondary leading-relaxed mb-2.5">{theme.description}</p>

      <div className="flex flex-wrap items-center gap-1 mb-2.5">
        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-text-secondary">
          {categoryLabels[theme.category] || theme.category}
        </span>
        {(theme.segments_affected || []).map((seg) => (
          <span key={seg} className="text-[9px] px-1 py-0.5 rounded bg-white/[0.03] text-text-secondary capitalize">
            {seg}
          </span>
        ))}
        {theme.estimated_revenue_impact && (
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${
            theme.estimated_revenue_impact === 'high' ? 'bg-red-500/10 text-red-400'
              : theme.estimated_revenue_impact === 'medium' ? 'bg-amber/10 text-amber'
                : 'bg-white/5 text-text-secondary'
          }`}>
            {theme.estimated_revenue_impact} rev impact
          </span>
        )}
      </div>

      {theme.representative_quotes?.length > 0 && (
        <div>
          <button
            data-testid={`theme-evidence-${theme.name}`}
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-purple font-medium hover:text-purple/80 transition-colors"
          >
            <Quote size={11} />
            Evidence ({theme.representative_quotes.length})
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {expanded && (
            <div className="mt-1.5 space-y-1.5 pl-2.5 border-l border-purple/20">
              {theme.representative_quotes.map((q, i) => (
                <p key={i} className="text-[11px] text-text-secondary italic leading-relaxed">"{q}"</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GapTable({ gaps, competitors }) {
  const competitorNames = competitors.map((c) => c.name)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-[10px] font-medium text-text-secondary py-2 pr-4 uppercase tracking-wider">Capability</th>
            <th className="text-center text-[10px] font-medium text-text-secondary py-2 px-3 uppercase tracking-wider">Sprint It</th>
            {competitorNames.map((name) => (
              <th key={name} className="text-center text-[10px] font-medium text-text-secondary py-2 px-3 uppercase tracking-wider">{name}</th>
            ))}
            <th className="text-center text-[10px] font-medium text-text-secondary py-2 px-3 uppercase tracking-wider">Opportunity</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((gap, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-white/[0.01] transition-colors">
              <td className="py-2.5 pr-4">
                <p className="text-[13px] font-medium text-text-primary">{gap.area}</p>
                <p className="text-[11px] text-text-secondary mt-0.5 leading-snug">{gap.insight}</p>
              </td>
              <td className="text-center py-2.5 px-3">
                <div className="flex justify-center">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusDotColors[gap.our_status] || 'bg-white/15'}`}
                    title={gap.our_status} />
                </div>
                <span className="text-[9px] text-text-secondary capitalize">{gap.our_status}</span>
              </td>
              {competitorNames.map((name) => {
                const comp = (gap.competitors || []).find((c) => c.name === name)
                const status = comp?.status || 'missing'
                return (
                  <td key={name} className="text-center py-2.5 px-3">
                    <div className="flex justify-center">
                      <span className={`w-2.5 h-2.5 rounded-full ${statusDotColors[status] || 'bg-white/15'}`}
                        title={status} />
                    </div>
                    <span className="text-[9px] text-text-secondary capitalize">{status}</span>
                  </td>
                )
              })}
              <td className="text-center py-2.5 px-3">
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${
                  gap.opportunity === 'high' ? 'bg-emerald-500/10 text-emerald-400'
                    : gap.opportunity === 'medium' ? 'bg-amber/10 text-amber'
                      : 'bg-white/5 text-text-secondary'
                }`}>
                  {gap.opportunity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ScoreBar({ label, value, max = 10 }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-secondary w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple rounded-full transition-all duration-300 shadow-[0_0_4px_rgba(139,124,246,0.3)]"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="text-[10px] font-medium text-text-primary w-4 text-right font-mono">{value}</span>
    </div>
  )
}

function RecommendationRow({ rec, rank, expanded, onToggle }) {
  const scorePercent = Math.min((rec._score / 10) * 100, 100)

  return (
    <div className="bg-bg-card rounded-lg border border-border card-glow overflow-hidden">
      <button
        data-testid={`rec-row-${rank}`}
        onClick={onToggle}
        className="w-full flex items-center gap-3.5 p-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-[11px] font-semibold text-text-secondary shrink-0 font-mono">
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-text-primary truncate">{rec.feature_name}</p>
          <p className="text-[11px] text-text-secondary mt-0.5">{rec.target_segment}</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-purple rounded-full" style={{ width: `${scorePercent}%` }} />
          </div>
          <span className="text-[13px] font-semibold text-purple w-8 text-right font-mono">{rec._score}</span>
          {expanded ? <ChevronUp size={14} className="text-text-secondary" /> : <ChevronDown size={14} className="text-text-secondary" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0 border-t border-border space-y-3.5">
          <div className="grid grid-cols-2 gap-3.5 pt-3">
            <div>
              <p className="text-[10px] font-medium text-text-secondary/60 uppercase tracking-widest mb-1">Description</p>
              <p className="text-[12px] text-text-primary/80 leading-relaxed">{rec.description}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-text-secondary/60 uppercase tracking-widest mb-1">Rationale</p>
              <p className="text-[12px] text-text-primary/80 leading-relaxed">{rec.rationale}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <p className="text-[10px] font-medium text-text-secondary/60 uppercase tracking-widest mb-1">Score Breakdown</p>
              <div className="space-y-1">
                <ScoreBar label="User Impact" value={rec.user_impact} />
                <ScoreBar label="Revenue" value={rec.revenue_impact} />
                <ScoreBar label="Effort" value={rec.effort} />
                <ScoreBar label="Strategic" value={rec.strategic_alignment} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-text-secondary/60 uppercase tracking-widest mb-1">Competitive Context</p>
              <p className="text-[12px] text-text-secondary leading-relaxed">{rec.competitive_context}</p>
            </div>
          </div>

          {(rec.evidence?.length > 0) && (
            <div>
              <p className="text-[10px] font-medium text-text-secondary/60 uppercase tracking-widest mb-1">Evidence</p>
              <div className="space-y-0.5 pl-2.5 border-l border-purple/20">
                {rec.evidence.map((e, i) => (
                  <p key={i} className="text-[11px] text-text-secondary italic">"{e}"</p>
                ))}
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
            <p className="text-[10px] font-medium text-red-400 mb-0.5">Risk if Delayed</p>
            <p className="text-[11px] text-red-400/80 leading-relaxed">{rec.risk_if_delayed}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Analysis() {
  const {
    feedbackData,
    competitorData,
    analysisResults,
    updateState,
    updatePipelineStatus,
    addEvent,
  } = useAppContext()
  const navigate = useNavigate()

  const [running, setRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [error, setError] = useState(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [expandedRec, setExpandedRec] = useState(null)

  const hasData = feedbackData.length > 0
  const hasResults = analysisResults.themes?.length > 0

  const sortedRecommendations = useMemo(() => {
    if (!analysisResults.recommendations?.length) return []
    return analysisResults.recommendations
      .map((rec) => ({ ...rec, _score: computeScore(rec, weights) }))
      .sort((a, b) => b._score - a._score)
  }, [analysisResults.recommendations, weights])

  const runAnalysis = useCallback(async () => {
    if (!hasData) return
    setRunning(true)
    setError(null)
    setCurrentStep(0)

    try {
      await addEvent('analysis_started', {
        entryCount: feedbackData.length,
        competitorCount: competitorData.length,
      }, `Analysis started: ${feedbackData.length} entries, ${competitorData.length} competitors`)

      updatePipelineStatus('analysis', 'active')

      const themeResult = await discoverThemes(feedbackData)
      const themes = themeResult.themes || []

      updateState({
        analysisResults: { ...analysisResults, themes },
      })

      const criticalCount = themes.filter((t) => t.severity === 'critical').length
      await addEvent('themes_found', {
        themeCount: themes.length,
        criticalCount,
      }, `Discovered ${themes.length} themes (${criticalCount} critical)`)

      setCurrentStep(1)

      const gapResult = await analyzeGaps(themes, competitorData)

      updateState({
        analysisResults: {
          ...analysisResults,
          themes,
          gaps: gapResult.gaps || [],
          marketPosition: gapResult.market_position,
          biggestThreat: gapResult.biggest_threat,
          biggestOpportunity: gapResult.biggest_opportunity,
        },
      })

      setCurrentStep(2)

      const recResult = await generateRecommendations(
        themes,
        gapResult.gaps || [],
        competitorData,
        weights
      )

      const finalResults = {
        themes,
        gaps: gapResult.gaps || [],
        marketPosition: gapResult.market_position,
        biggestThreat: gapResult.biggest_threat,
        biggestOpportunity: gapResult.biggest_opportunity,
        recommendations: recResult.recommendations || [],
        summary: recResult.summary,
      }

      updateState({ analysisResults: finalResults })
      updatePipelineStatus('analysis', 'complete')

      const topFeature = (recResult.recommendations || [])[0]?.feature_name || 'N/A'
      await addEvent('recommendations_made', {
        topFeature,
        count: (recResult.recommendations || []).length,
      }, `Generated ${(recResult.recommendations || []).length} recommendations. Top: ${topFeature}`)

      setCurrentStep(3)
      setRunning(false)
    } catch (err) {
      setError(err.message)
      setRunning(false)
    }
  }, [hasData, feedbackData, competitorData, analysisResults, weights, updateState, updatePipelineStatus, addEvent])

  const handleWeightChange = (key) => (val) => {
    setWeights((prev) => ({ ...prev, [key]: val }))
  }

  if (!hasData) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-10 text-center">
        <Target size={36} className="mx-auto mb-3 text-text-secondary/15" />
        <h2 className="text-base font-semibold mb-1.5 text-text-primary">No Data to Analyze</h2>
        <p className="text-[13px] text-text-secondary mb-4">
          Head to the Ingest Data page to load feedback entries first.
        </p>
        <button
          data-testid="goto-ingest-btn"
          onClick={() => navigate('/ingest')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-[13px] font-medium hover:bg-purple/90 transition-colors glow-btn"
        >
          Go to Ingest Data <ArrowRight size={14} />
        </button>
      </div>
    )
  }

  return (
    <div data-testid="analysis-page" className="space-y-5">
      <div className="bg-bg-card rounded-xl border border-border p-5 card-glow">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-text-primary">AI Analysis Engine</h2>
            <p className="text-[13px] text-text-secondary mt-0.5">
              <span className="font-mono">{feedbackData.length}</span> feedback entries + <span className="font-mono">{competitorData.length}</span> competitors ready
            </p>
          </div>
          <button
            data-testid="run-analysis-btn"
            onClick={runAnalysis}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple text-white text-[13px] font-semibold hover:bg-purple/90 transition-all disabled:opacity-40 glow-btn"
          >
            {running ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            {running ? 'Analyzing...' : 'Run Full Analysis'}
          </button>
        </div>

        <button
          data-testid="config-toggle"
          onClick={() => setConfigOpen(!configOpen)}
          className="flex items-center gap-1.5 text-[11px] text-text-secondary font-medium hover:text-purple transition-colors"
        >
          <SlidersHorizontal size={12} />
          Analysis Configuration
          {configOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {configOpen && (
          <div className="mt-3 p-3.5 bg-white/[0.02] rounded-lg border border-border space-y-2.5">
            <p className="text-[11px] text-text-secondary mb-1">Priority weight configuration</p>
            <WeightSlider label="User Impact" value={weights.userImpact} onChange={handleWeightChange('userImpact')} />
            <WeightSlider label="Revenue Impact" value={weights.revenueImpact} onChange={handleWeightChange('revenueImpact')} />
            <WeightSlider label="Effort (inverse)" value={weights.effort} onChange={handleWeightChange('effort')} />
            <WeightSlider label="Strategic Align" value={weights.strategicAlignment} onChange={handleWeightChange('strategicAlignment')} />
          </div>
        )}
      </div>

      {running && (
        <>
          <ProgressStepper currentStep={currentStep} error={error} />
          <PulsingBar />
        </>
      )}

      {error && (
        <Toast
          message={error}
          onRetry={runAnalysis}
          onDismiss={() => setError(null)}
        />
      )}

      {analysisResults.themes?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-text-primary">
              Discovered <span className="text-purple font-mono">{analysisResults.themes.length}</span> themes across <span className="font-mono">{feedbackData.length}</span> entries
            </h2>
          </div>
          <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3">
            {analysisResults.themes.map((theme, i) => (
              <ThemeCard key={i} theme={theme} />
            ))}
          </div>
        </div>
      )}

      {analysisResults.gaps?.length > 0 && (
        <div className="space-y-3">
          {analysisResults.marketPosition && (
            <div className="bg-bg-card rounded-xl border border-amber/20 p-4 card-glow">
              <div className="flex items-center gap-2 mb-1.5">
                <Shield size={16} className="text-amber" />
                <h3 className="text-[13px] font-semibold text-text-primary">Market Position</h3>
              </div>
              <p className="text-[13px] text-text-primary/80 leading-relaxed">{analysisResults.marketPosition}</p>
            </div>
          )}

          <div className="bg-bg-card rounded-xl border border-border p-4 card-glow">
            <h3 className="text-[13px] font-semibold text-text-primary mb-3">Competitive Gap Analysis</h3>
            <GapTable gaps={analysisResults.gaps} competitors={competitorData} />
          </div>

          <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3">
            {analysisResults.biggestThreat && (
              <div className="bg-bg-card rounded-lg border border-red-500/15 p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle size={14} className="text-red-400" />
                  <h4 className="text-[10px] font-semibold text-red-400 uppercase tracking-widest">Biggest Threat</h4>
                </div>
                <p className="text-[13px] text-text-primary/80 leading-relaxed">{analysisResults.biggestThreat}</p>
              </div>
            )}
            {analysisResults.biggestOpportunity && (
              <div className="bg-bg-card rounded-lg border border-emerald-500/15 p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lightbulb size={14} className="text-emerald-400" />
                  <h4 className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">Biggest Opportunity</h4>
                </div>
                <p className="text-[13px] text-text-primary/80 leading-relaxed">{analysisResults.biggestOpportunity}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {sortedRecommendations.length > 0 && (
        <div className="space-y-3">
          {analysisResults.summary && (
            <div className="bg-purple/10 border border-purple/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={16} className="text-purple" />
                <h3 className="text-[10px] font-semibold text-purple uppercase tracking-widest">Strategic Recommendation</h3>
              </div>
              <p className="text-[14px] text-text-primary leading-relaxed font-medium">{analysisResults.summary}</p>
            </div>
          )}

          {sortedRecommendations[0] && (
            <div className="bg-bg-card rounded-xl border-2 border-purple/30 p-5 glow-btn">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-7 h-7 rounded-md bg-purple/20 border border-purple/30 flex items-center justify-center text-[12px] font-bold text-purple font-mono">1</span>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">{sortedRecommendations[0].feature_name}</h3>
                  <p className="text-[11px] text-text-secondary">Top priority -- Score: <span className="text-purple font-mono">{sortedRecommendations[0]._score}</span>/10</p>
                </div>
              </div>
              <p className="text-[13px] text-text-primary/80 leading-relaxed mb-3">{sortedRecommendations[0].description}</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-[10px] font-medium text-text-secondary/60 uppercase tracking-widest mb-1">Rationale</p>
                  <p className="text-[12px] text-text-primary/80 leading-relaxed">{sortedRecommendations[0].rationale}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-text-secondary/60 uppercase tracking-widest mb-1">Score Breakdown</p>
                  <ScoreBar label="User Impact" value={sortedRecommendations[0].user_impact} />
                  <ScoreBar label="Revenue" value={sortedRecommendations[0].revenue_impact} />
                  <ScoreBar label="Effort" value={sortedRecommendations[0].effort} />
                  <ScoreBar label="Strategic" value={sortedRecommendations[0].strategic_alignment} />
                </div>
              </div>
              {sortedRecommendations[0].evidence?.length > 0 && (
                <div className="pl-2.5 border-l border-purple/20 mb-3">
                  {sortedRecommendations[0].evidence.map((e, i) => (
                    <p key={i} className="text-[11px] text-text-secondary italic mb-0.5">"{e}"</p>
                  ))}
                </div>
              )}
              <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                <p className="text-[10px] font-medium text-red-400 mb-0.5">Risk if Delayed</p>
                <p className="text-[11px] text-red-400/80">{sortedRecommendations[0].risk_if_delayed}</p>
              </div>
            </div>
          )}

          <div className="bg-bg-card rounded-xl border border-border p-4 card-glow">
            <div className="flex items-center gap-2 mb-2.5">
              <SlidersHorizontal size={14} className="text-purple" />
              <h3 className="text-[13px] font-semibold text-text-primary">Adjust Priority Weights</h3>
              <span className="text-[10px] text-text-secondary">(re-sorts live)</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <WeightSlider label="User Impact" value={weights.userImpact} onChange={handleWeightChange('userImpact')} />
              <WeightSlider label="Revenue Impact" value={weights.revenueImpact} onChange={handleWeightChange('revenueImpact')} />
              <WeightSlider label="Effort (inverse)" value={weights.effort} onChange={handleWeightChange('effort')} />
              <WeightSlider label="Strategic Align" value={weights.strategicAlignment} onChange={handleWeightChange('strategicAlignment')} />
            </div>
          </div>

          {sortedRecommendations.length > 1 && (
            <div className="space-y-2.5">
              <h3 className="text-[13px] font-semibold text-text-primary">All Recommendations</h3>
              {sortedRecommendations.slice(1).map((rec, i) => (
                <RecommendationRow
                  key={rec.feature_name}
                  rec={rec}
                  rank={i + 2}
                  expanded={expandedRec === rec.feature_name}
                  onToggle={() =>
                    setExpandedRec(expandedRec === rec.feature_name ? null : rec.feature_name)
                  }
                />
              ))}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              data-testid="goto-documents-btn"
              onClick={() => {
                updatePipelineStatus('docs', 'active')
                navigate('/documents')
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple text-white text-[13px] font-semibold hover:bg-purple/90 transition-all glow-btn"
            >
              <FileText size={16} />
              Generate Documents
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
