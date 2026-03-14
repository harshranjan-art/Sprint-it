import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  FileText,
  Target,
  FileCheck,
  FlaskConical,
  Copy,
  RefreshCw,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Users,
  AlertTriangle,
  Check,
  Quote,
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { generateDocument } from '../services/docService'

// ─── Constants ──────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { key: 'prd', label: 'PRD', icon: FileText },
  { key: 'okrs', label: 'OKRs', icon: Target },
  { key: 'onePager', label: 'One-Pager', icon: FileCheck },
  { key: 'experimentSpec', label: 'Experiment Spec', icon: FlaskConical },
]

// ─── Markdown components with styled headers ────────────────────────────────

const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-purple mt-8 mb-4 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-purple mt-7 mb-3 pb-2 border-b border-border">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-text-primary mt-5 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-text-primary mt-4 mb-1.5">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-sm text-text-primary leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-5 mb-4 space-y-1.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-5 mb-4 space-y-1.5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-text-primary leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-purple-light pl-4 my-4 italic text-text-secondary">{children}</blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="text-left text-xs font-medium text-text-secondary py-2 px-3 border border-border">{children}</th>
  ),
  td: ({ children }) => (
    <td className="text-sm text-text-primary py-2 px-3 border border-border">{children}</td>
  ),
  hr: () => <hr className="my-6 border-border" />,
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className="block bg-gray-50 rounded-lg p-4 text-xs font-mono text-text-primary overflow-x-auto my-3">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-gray-100 rounded px-1.5 py-0.5 text-xs font-mono text-purple">{children}</code>
    )
  },
}

// ─── Feature selector card ──────────────────────────────────────────────────

function FeatureCard({ rec, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-purple bg-purple-light shadow-[0_0_0_1px_rgba(124,107,240,0.2)]'
          : 'border-border bg-bg-card hover:border-purple/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          selected ? 'bg-purple text-white' : 'bg-gray-100 text-text-secondary'
        }`}>
          {rec.rank}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          selected ? 'bg-purple/20 text-purple' : 'bg-gray-100 text-text-secondary'
        }`}>
          {rec.priority_score?.toFixed?.(1) || rec._score || '—'}/10
        </span>
      </div>
      <h4 className="text-sm font-semibold text-text-primary mb-0.5 line-clamp-1">{rec.feature_name}</h4>
      <p className="text-xs text-text-secondary">{rec.target_segment}</p>
    </button>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function Documents() {
  const {
    analysisResults,
    generatedDocs,
    updateState,
    updatePipelineStatus,
    addEvent,
  } = useAppContext()
  const navigate = useNavigate()

  const recommendations = analysisResults.recommendations || []
  const themes = analysisResults.themes || []
  const gaps = analysisResults.gaps || []
  const topRecs = recommendations.slice(0, 3)

  const [selectedFeatureIdx, setSelectedFeatureIdx] = useState(0)
  const [activeTab, setActiveTab] = useState('prd')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [evidenceOpen, setEvidenceOpen] = useState(false)

  const selectedRec = topRecs[selectedFeatureIdx] || null
  const featureId = selectedRec?.feature_name || ''

  // Get cached doc from context
  const cachedDoc = useMemo(() => {
    const featureDocs = generatedDocs[featureId]
    return featureDocs?.[activeTab] || null
  }, [generatedDocs, featureId, activeTab])

  // Cache a generated doc into context
  const cacheDoc = useCallback((fId, docType, doc) => {
    const updated = { ...generatedDocs }
    if (!updated[fId]) updated[fId] = {}
    updated[fId][docType] = doc
    updateState({ generatedDocs: updated })
  }, [generatedDocs, updateState])

  // Generate a document
  const handleGenerate = useCallback(async (forceRegenerate = false) => {
    if (!selectedRec) return
    if (cachedDoc && !forceRegenerate) return

    setGenerating(true)
    setError(null)

    try {
      const doc = await generateDocument(activeTab, selectedRec, themes, gaps)
      cacheDoc(featureId, activeTab, doc)

      updatePipelineStatus('docs', 'complete')
      await addEvent('doc_generated', {
        feature: selectedRec.feature_name,
        type: activeTab,
      }, `Generated ${activeTab.toUpperCase()} for "${selectedRec.feature_name}"`)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }, [selectedRec, cachedDoc, activeTab, themes, gaps, featureId, cacheDoc, updatePipelineStatus, addEvent])

  // Tab click — switch and auto-generate if not cached
  const handleTabClick = useCallback((tabKey) => {
    setActiveTab(tabKey)
    setError(null)
    setCopied(false)
    setEvidenceOpen(false)
  }, [])

  // Copy markdown to clipboard
  const handleCopy = useCallback(async () => {
    if (!cachedDoc?.content) return
    await navigator.clipboard.writeText(cachedDoc.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [cachedDoc])

  // Download as .md
  const handleDownload = useCallback(() => {
    if (!cachedDoc?.content) return
    const blob = new Blob([cachedDoc.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${featureId.replace(/\s+/g, '-').toLowerCase()}-${activeTab}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [cachedDoc, featureId, activeTab])

  // Evidence quotes from the selected recommendation
  const evidence = selectedRec?.evidence || []

  // ── No data state ──
  if (recommendations.length === 0) {
    return (
      <div className="bg-bg-card rounded-2xl border border-border p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
        <FileText size={40} className="mx-auto mb-4 text-text-secondary/30" />
        <h2 className="text-lg font-semibold mb-2">No Recommendations Yet</h2>
        <p className="text-sm text-text-secondary mb-5">
          Run the AI Analysis first to generate recommendations for document creation.
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
    <div className="space-y-6">
      {/* ── Feature Selector ── */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Select a feature to generate documents for</h2>
        <div className="flex gap-3">
          {topRecs.map((rec, i) => (
            <FeatureCard
              key={rec.feature_name}
              rec={rec}
              selected={i === selectedFeatureIdx}
              onClick={() => {
                setSelectedFeatureIdx(i)
                setError(null)
                setCopied(false)
                setEvidenceOpen(false)
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Doc Generation Panel ── */}
      {selectedRec && (
        <div className="bg-bg-card rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center border-b border-border">
            {DOC_TYPES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleTabClick(key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative ${
                  activeTab === key
                    ? 'text-purple'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon size={16} />
                {label}
                {/* Check if doc is cached */}
                {generatedDocs[featureId]?.[key] && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
                {activeTab === key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple" />
                )}
              </button>
            ))}

            {/* Generate button */}
            <div className="ml-auto pr-4">
              <button
                onClick={() => handleGenerate(!cachedDoc)}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple/90 transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : cachedDoc ? (
                  <RefreshCw size={14} />
                ) : (
                  <FileText size={14} />
                )}
                {generating ? 'Generating...' : cachedDoc ? 'Regenerate' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 px-6 py-3 bg-red-50 border-b border-red-100">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button
                onClick={() => handleGenerate(true)}
                className="text-sm font-medium text-red-700 hover:text-red-800 px-3 py-1 rounded bg-red-100 hover:bg-red-200 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Document content */}
          <div className="p-6">
            {generating && !cachedDoc ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 size={32} className="text-purple animate-spin mb-4" />
                <p className="text-sm text-text-secondary">Generating {DOC_TYPES.find((d) => d.key === activeTab)?.label}...</p>
                <p className="text-xs text-text-secondary/60 mt-1">This may take 15-30 seconds</p>
              </div>
            ) : cachedDoc ? (
              <div>
                {/* Doc header bar */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-text-primary">{selectedRec.feature_name}</h3>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-light text-purple uppercase">
                      {DOC_TYPES.find((d) => d.key === activeTab)?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary">
                      {new Date(cachedDoc.timestamp).toLocaleString()}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
                    >
                      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => handleGenerate(true)}
                      disabled={generating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
                      Regenerate
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
                    >
                      <Download size={12} />
                      Download .md
                    </button>
                  </div>
                </div>

                {/* Rendered markdown */}
                <div className="max-w-[720px] mx-auto">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {cachedDoc.content}
                  </ReactMarkdown>
                </div>

                {/* Evidence section */}
                {evidence.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-border max-w-[720px] mx-auto">
                    <button
                      onClick={() => setEvidenceOpen(!evidenceOpen)}
                      className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-purple transition-colors"
                    >
                      <Quote size={14} />
                      Evidence Used ({evidence.length} quotes)
                      {evidenceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {evidenceOpen && (
                      <div className="mt-3 space-y-2 pl-4 border-l-2 border-purple-light">
                        {evidence.map((q, i) => (
                          <p key={i} className="text-xs text-text-secondary italic leading-relaxed">"{q}"</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText size={36} className="text-text-secondary/20 mb-3" />
                <p className="text-sm text-text-secondary mb-1">
                  No {DOC_TYPES.find((d) => d.key === activeTab)?.label} generated yet
                </p>
                <p className="text-xs text-text-secondary/60">
                  Click "Generate" to create this document
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Next step CTA ── */}
      {Object.keys(generatedDocs).some((fId) => Object.keys(generatedDocs[fId] || {}).length > 0) && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              updatePipelineStatus('assign', 'active')
              navigate('/assignments')
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition-colors shadow-[0_2px_8px_rgba(124,107,240,0.3)]"
          >
            <Users size={18} />
            Assign to Team
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
