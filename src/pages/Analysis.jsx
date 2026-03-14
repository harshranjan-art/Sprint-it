import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  ChevronDown,
  ChevronUp,
  ChevronRight,
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

// ─── Constants ──────────────────────────────────────────────────────────────

const STEPS = [
  { key: 'themes', label: 'Discovering themes...' },
  { key: 'gaps', label: 'Analyzing competitive gaps...' },
  { key: 'recs', label: 'Generating recommendations...' },
]

const severityColors = {
  critical: { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  high: { border: 'border-l-amber', bg: 'bg-amber-50', text: 'text-amber-700' },
  medium: { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  low: { border: 'border-l-gray-300', bg: 'bg-gray-50', text: 'text-text-secondary' },
}

const categoryLabels = {
  feature_gap: 'Feature Gap',
  bug: 'Bug',
  ux_friction: 'UX Friction',
  competitive_pressure: 'Competitive',
  praise: 'Praise',
}

const statusDotColors = {
  strong: 'bg-green-500',
  building: 'bg-amber',
  weak: 'bg-red-500',
  missing: 'bg-gray-300',
}

const DEFAULT_WEIGHTS = { userImpact: 25, revenueImpact: 25, effort: 25, strategicAlignment: 25 }

// ─── Helper ─────────────────────────────────────────────────────────────────

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

// ─── Sub-components ─────────────────────────────────────────────────────────

function ProgressStepper({ currentStep, error }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {STEPS.map((step, i) => {
        const isActive = i === currentStep
        const isDone = i < currentStep
        const isFailed = isActive && error
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isFailed
                    ? 'bg-red-100 text-red-600'
                    : isDone
                      ? 'bg-purple text-white'
                      : isActive
                        ? 'bg-amber text-white'
                        : 'bg-gray-100 text-text-secondary'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                className={`text-sm ${
                  isActive ? 'text-text-primary font-medium' : 'text-text-secondary'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        )
      })}
    </div>
  )
}

function PulsingBar() {
  return (
    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-6">
      <div className="h-full w-1/3 bg-purple rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" />
    </div>
  )
}

function Toast({ message, onRetry, onDismiss }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 mb-6">
      <AlertTriangle size={18} className="text-red-500 shrink-0" />
      <p className="text-sm text-red-700 flex-1">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-800 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition-colors"
      >
        <RefreshCw size={14} /> Retry
      </button>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600">
        <X size={16} />
      </button>
    </div>
  )
}

function WeightSlider({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary w-32 shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 accent-purple cursor-pointer"
      />
      <span className="text-xs font-medium text-text-primary w-8 text-right">{value}</span>
    </div>
  )
}

function ThemeCard({ theme }) {
  const [expanded, setExpanded] = useState(false)
  const colors = severityColors[theme.severity] || severityColors.low

  return (
    <div className={`bg-bg-card rounded-xl border border-border border-l-4 ${colors.border} p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-text-primary leading-snug pr-2">{theme.name}</h4>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} capitalize`}>
            {theme.severity}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-light text-purple">
            {theme.frequency} mentions
          </span>
        </div>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed mb-3">{theme.description}</p>

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-text-secondary">
          {categoryLabels[theme.category] || theme.category}
        </span>
        {(theme.segments_affected || []).map((seg) => (
          <span key={seg} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-text-secondary capitalize">
            {seg}
          </span>
        ))}
        {theme.estimated_revenue_impact && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            theme.estimated_revenue_impact === 'high' ? 'bg-red-50 text-red-600'
              : theme.estimated_revenue_impact === 'medium' ? 'bg-amber-50 text-amber-600'
                : 'bg-gray-50 text-text-secondary'
          }`}>
            {theme.estimated_revenue_impact} revenue impact
          </span>
        )}
      </div>

      {/* Evidence toggle */}
      {theme.representative_quotes?.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-purple font-medium hover:text-purple/80 transition-colors"
          >
            <Quote size={12} />
            View Evidence ({theme.representative_quotes.length})
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2 pl-3 border-l-2 border-purple-light">
              {theme.representative_quotes.map((q, i) => (
                <p key={i} className="text-xs text-text-secondary italic leading-relaxed">
                  "{q}"
                </p>
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
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs font-medium text-text-secondary py-2 pr-4">Capability</th>
            <th className="text-center text-xs font-medium text-text-secondary py-2 px-3">Sprint It</th>
            {competitorNames.map((name) => (
              <th key={name} className="text-center text-xs font-medium text-text-secondary py-2 px-3">{name}</th>
            ))}
            <th className="text-center text-xs font-medium text-text-secondary py-2 px-3">Opportunity</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((gap, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="py-3 pr-4">
                <p className="text-sm font-medium text-text-primary">{gap.area}</p>
                <p className="text-xs text-text-secondary mt-0.5 leading-snug">{gap.insight}</p>
              </td>
              <td className="text-center py-3 px-3">
                <div className="flex justify-center">
                  <span className={`w-3 h-3 rounded-full ${statusDotColors[gap.our_status] || 'bg-gray-300'}`}
                    title={gap.our_status} />
                </div>
                <span className="text-[10px] text-text-secondary capitalize">{gap.our_status}</span>
              </td>
              {competitorNames.map((name) => {
                const comp = (gap.competitors || []).find((c) => c.name === name)
                const status = comp?.status || 'missing'
                return (
                  <td key={name} className="text-center py-3 px-3">
                    <div className="flex justify-center">
                      <span className={`w-3 h-3 rounded-full ${statusDotColors[status] || 'bg-gray-300'}`}
                        title={status} />
                    </div>
                    <span className="text-[10px] text-text-secondary capitalize">{status}</span>
                  </td>
                )
              })}
              <td className="text-center py-3 px-3">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  gap.opportunity === 'high' ? 'bg-green-50 text-green-700'
                    : gap.opportunity === 'medium' ? 'bg-amber-50 text-amber-700'
                      : 'bg-gray-50 text-text-secondary'
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
      <span className="text-[10px] text-text-secondary w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple rounded-full transition-all duration-300"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="text-[10px] font-medium text-text-primary w-5 text-right">{value}</span>
    </div>
  )
}

function RecommendationRow({ rec, rank, expanded, onToggle }) {
  const scorePercent = Math.min((rec._score / 10) * 100, 100)

  return (
    <div className="bg-bg-card rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-text-secondary shrink-0">
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{rec.feature_name}</p>
          <p className="text-xs text-text-secondary mt-0.5">{rec.target_segment}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple rounded-full" style={{ width: `${scorePercent}%` }} />
          </div>
          <span className="text-sm font-semibold text-purple w-10 text-right">{rec._score}</span>
          {expanded ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border space-y-4">
          <div className="grid grid-cols-2 gap-4 pt-3">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">Description</p>
              <p className="text-sm text-text-primary leading-relaxed">{rec.description}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">Rationale</p>
              <p className="text-sm text-text-primary leading-relaxed">{rec.rationale}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">Score Breakdown</p>
              <div className="space-y-1.5">
                <ScoreBar label="User Impact" value={rec.user_impact} />
                <ScoreBar label="Revenue" value={rec.revenue_impact} />
                <ScoreBar label="Effort" value={rec.effort} />
                <ScoreBar label="Strategic" value={rec.strategic_alignment} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">Competitive Context</p>
              <p className="text-sm text-text-secondary leading-relaxed">{rec.competitive_context}</p>
            </div>
          </div>

          {(rec.evidence?.length > 0) && (
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">Evidence</p>
              <div className="space-y-1 pl-3 border-l-2 border-purple-light">
                {rec.evidence.map((e, i) => (
                  <p key={i} className="text-xs text-text-secondary italic">"{e}"</p>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-xs font-medium text-red-700 mb-0.5">Risk if Delayed</p>
            <p className="text-xs text-red-600 leading-relaxed">{rec.risk_if_delayed}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

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

  // Recalculate scores client-side when weights change
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
      // Step 1: Theme Discovery
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

      // Step 2: Competitive Gap Analysis
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

      // Step 3: Recommendations
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
      <div className="bg-bg-card rounded-2xl border border-border p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
        <Target size={40} className="mx-auto mb-4 text-text-secondary/30" />
        <h2 className="text-lg font-semibold mb-2">No Data to Analyze</h2>
        <p className="text-sm text-text-secondary mb-5">
          Head to the Ingest Data page to load feedback entries first.
        </p>
        <button
          onClick={() => navigate('/ingest')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple text-white text-sm font-medium hover:bg-purple/90 transition-colors"
        >
          Go to Ingest Data <ArrowRight size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Control Panel ── */}
      <div className="bg-bg-card rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">AI Analysis Engine</h2>
            <p className="text-sm text-text-secondary mt-0.5">
              {feedbackData.length} feedback entries + {competitorData.length} competitors ready
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={running}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition-colors disabled:opacity-50 shadow-[0_2px_8px_rgba(124,107,240,0.3)]"
          >
            {running ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Play size={18} />
            )}
            {running ? 'Analyzing...' : 'Run Full Analysis'}
          </button>
        </div>

        {/* Config toggle */}
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="flex items-center gap-1.5 text-xs text-text-secondary font-medium hover:text-purple transition-colors"
        >
          <SlidersHorizontal size={14} />
          Analysis Configuration
          {configOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {configOpen && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
            <p className="text-xs text-text-secondary mb-1">Priority weight configuration — these affect recommendation scoring</p>
            <WeightSlider label="User Impact" value={weights.userImpact} onChange={handleWeightChange('userImpact')} />
            <WeightSlider label="Revenue Impact" value={weights.revenueImpact} onChange={handleWeightChange('revenueImpact')} />
            <WeightSlider label="Effort (inverse)" value={weights.effort} onChange={handleWeightChange('effort')} />
            <WeightSlider label="Strategic Alignment" value={weights.strategicAlignment} onChange={handleWeightChange('strategicAlignment')} />
          </div>
        )}
      </div>

      {/* ── Progress / Error ── */}
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

      {/* ── Results: Themes ── */}
      {analysisResults.themes?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary">
              Discovered {analysisResults.themes.length} themes across {feedbackData.length} feedback entries
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {analysisResults.themes.map((theme, i) => (
              <ThemeCard key={i} theme={theme} />
            ))}
          </div>
        </div>
      )}

      {/* ── Results: Gap Analysis ── */}
      {analysisResults.gaps?.length > 0 && (
        <div className="space-y-4">
          {/* Market Position */}
          {analysisResults.marketPosition && (
            <div className="bg-bg-card rounded-2xl border-2 border-amber p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={18} className="text-amber" />
                <h3 className="text-sm font-semibold text-text-primary">Market Position</h3>
              </div>
              <p className="text-sm text-text-primary leading-relaxed">{analysisResults.marketPosition}</p>
            </div>
          )}

          {/* Gap Table */}
          <div className="bg-bg-card rounded-2xl border border-border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Competitive Gap Analysis</h3>
            <GapTable gaps={analysisResults.gaps} competitors={competitorData} />
          </div>

          {/* Threat & Opportunity */}
          <div className="grid grid-cols-2 gap-4">
            {analysisResults.biggestThreat && (
              <div className="bg-bg-card rounded-xl border border-red-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wider">Biggest Threat</h4>
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{analysisResults.biggestThreat}</p>
              </div>
            )}
            {analysisResults.biggestOpportunity && (
              <div className="bg-bg-card rounded-xl border border-green-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} className="text-green-600" />
                  <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wider">Biggest Opportunity</h4>
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{analysisResults.biggestOpportunity}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Results: Recommendations ── */}
      {sortedRecommendations.length > 0 && (
        <div className="space-y-4">
          {/* Executive Summary */}
          {analysisResults.summary && (
            <div className="bg-purple rounded-2xl p-6 shadow-[0_2px_8px_rgba(124,107,240,0.3)]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-white/80" />
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Strategic Recommendation</h3>
              </div>
              <p className="text-base text-white leading-relaxed font-medium">{analysisResults.summary}</p>
            </div>
          )}

          {/* #1 Hero Card */}
          {sortedRecommendations[0] && (
            <div className="bg-bg-card rounded-2xl border-2 border-purple p-6 shadow-[0_2px_8px_rgba(124,107,240,0.1)]">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-full bg-purple flex items-center justify-center text-sm font-bold text-white">1</span>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{sortedRecommendations[0].feature_name}</h3>
                  <p className="text-xs text-text-secondary">Top priority — Score: {sortedRecommendations[0]._score}/10</p>
                </div>
              </div>
              <p className="text-sm text-text-primary leading-relaxed mb-4">{sortedRecommendations[0].description}</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">Rationale</p>
                  <p className="text-sm text-text-primary leading-relaxed">{sortedRecommendations[0].rationale}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">Score Breakdown</p>
                  <ScoreBar label="User Impact" value={sortedRecommendations[0].user_impact} />
                  <ScoreBar label="Revenue" value={sortedRecommendations[0].revenue_impact} />
                  <ScoreBar label="Effort" value={sortedRecommendations[0].effort} />
                  <ScoreBar label="Strategic" value={sortedRecommendations[0].strategic_alignment} />
                </div>
              </div>
              {sortedRecommendations[0].evidence?.length > 0 && (
                <div className="pl-3 border-l-2 border-purple-light mb-4">
                  {sortedRecommendations[0].evidence.map((e, i) => (
                    <p key={i} className="text-xs text-text-secondary italic mb-1">"{e}"</p>
                  ))}
                </div>
              )}
              <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                <p className="text-xs font-medium text-red-700 mb-0.5">Risk if Delayed</p>
                <p className="text-xs text-red-600">{sortedRecommendations[0].risk_if_delayed}</p>
              </div>
            </div>
          )}

          {/* Weight Sliders (live re-sort) */}
          <div className="bg-bg-card rounded-2xl border border-border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal size={16} className="text-purple" />
              <h3 className="text-sm font-semibold text-text-primary">Adjust Priority Weights</h3>
              <span className="text-xs text-text-secondary">(re-sorts in real time)</span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <WeightSlider label="User Impact" value={weights.userImpact} onChange={handleWeightChange('userImpact')} />
              <WeightSlider label="Revenue Impact" value={weights.revenueImpact} onChange={handleWeightChange('revenueImpact')} />
              <WeightSlider label="Effort (inverse)" value={weights.effort} onChange={handleWeightChange('effort')} />
              <WeightSlider label="Strategic Alignment" value={weights.strategicAlignment} onChange={handleWeightChange('strategicAlignment')} />
            </div>
          </div>

          {/* Remaining Recommendations */}
          {sortedRecommendations.length > 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">All Recommendations</h3>
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

          {/* Generate Documents CTA */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                updatePipelineStatus('docs', 'active')
                navigate('/documents')
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition-colors shadow-[0_2px_8px_rgba(124,107,240,0.3)]"
            >
              <FileText size={18} />
              Generate Documents
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
