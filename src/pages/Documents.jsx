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

const DOC_TYPES = [
  { key: 'prd', label: 'PRD', icon: FileText },
  { key: 'okrs', label: 'OKRs', icon: Target },
  { key: 'onePager', label: 'One-Pager', icon: FileCheck },
  { key: 'experimentSpec', label: 'Experiment Spec', icon: FlaskConical },
]

const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-purple mt-7 mb-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-purple mt-6 mb-2.5 pb-1.5 border-b border-border">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[14px] font-semibold text-text-primary mt-4 mb-1.5">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[13px] font-semibold text-text-primary mt-3 mb-1">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-[13px] text-text-primary/80 leading-relaxed mb-2.5">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-5 mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-5 mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[13px] text-text-primary/80 leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-purple/20 pl-3 my-3 italic text-text-secondary">{children}</blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-[13px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/[0.02]">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="text-left text-[11px] font-medium text-text-secondary py-1.5 px-2.5 border border-border">{children}</th>
  ),
  td: ({ children }) => (
    <td className="text-[13px] text-text-primary/80 py-1.5 px-2.5 border border-border">{children}</td>
  ),
  hr: () => <hr className="my-5 border-border" />,
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className="block bg-white/[0.03] rounded-lg p-3.5 text-[11px] font-mono text-text-primary overflow-x-auto my-2.5 border border-border">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-purple/10 rounded px-1.5 py-0.5 text-[11px] font-mono text-purple">{children}</code>
    )
  },
}

function FeatureCard({ rec, selected, onClick }) {
  return (
    <button
      data-testid={`feature-card-${rec.rank}`}
      onClick={onClick}
      className={`flex-1 text-left p-3.5 rounded-lg border transition-all ${
        selected
          ? 'border-purple/40 bg-purple/5 shadow-[0_0_12px_rgba(139,124,246,0.08)]'
          : 'border-border bg-bg-card hover:border-purple/20 card-glow'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono ${
          selected ? 'bg-purple/20 text-purple border border-purple/30' : 'bg-white/5 text-text-secondary'
        }`}>
          {rec.rank}
        </span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md font-mono ${
          selected ? 'bg-purple/15 text-purple' : 'bg-white/5 text-text-secondary'
        }`}>
          {rec.priority_score?.toFixed?.(1) || rec._score || '--'}/10
        </span>
      </div>
      <h4 className="text-[13px] font-semibold text-text-primary mb-0.5 line-clamp-1">{rec.feature_name}</h4>
      <p className="text-[11px] text-text-secondary">{rec.target_segment}</p>
    </button>
  )
}

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

  const cachedDoc = useMemo(() => {
    const featureDocs = generatedDocs[featureId]
    return featureDocs?.[activeTab] || null
  }, [generatedDocs, featureId, activeTab])

  const cacheDoc = useCallback((fId, docType, doc) => {
    const updated = { ...generatedDocs }
    if (!updated[fId]) updated[fId] = {}
    updated[fId][docType] = doc
    updateState({ generatedDocs: updated })
  }, [generatedDocs, updateState])

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

  const handleTabClick = useCallback((tabKey) => {
    setActiveTab(tabKey)
    setError(null)
    setCopied(false)
    setEvidenceOpen(false)
  }, [])

  const handleCopy = useCallback(async () => {
    if (!cachedDoc?.content) return
    await navigator.clipboard.writeText(cachedDoc.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [cachedDoc])

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

  const evidence = selectedRec?.evidence || []

  if (recommendations.length === 0) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-10 text-center">
        <FileText size={36} className="mx-auto mb-3 text-text-secondary/15" />
        <h2 className="text-base font-semibold mb-1.5 text-text-primary">No Recommendations Yet</h2>
        <p className="text-[13px] text-text-secondary mb-4">
          Run the AI Analysis first to generate recommendations for document creation.
        </p>
        <button
          data-testid="goto-analysis-btn"
          onClick={() => navigate('/analysis')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-[13px] font-medium hover:bg-purple/90 transition-colors glow-btn"
        >
          Go to Analysis <ArrowRight size={14} />
        </button>
      </div>
    )
  }

  return (
    <div data-testid="documents-page" className="space-y-5">
      <div>
        <h2 className="text-[13px] font-medium text-text-secondary mb-2.5">Select a feature to generate documents for</h2>
        <div className="flex gap-2.5">
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

      {selectedRec && (
        <div className="bg-bg-card rounded-xl border border-border card-glow overflow-hidden">
          <div className="flex items-center border-b border-border">
            {DOC_TYPES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                data-testid={`doc-tab-${key}`}
                onClick={() => handleTabClick(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium transition-colors relative ${
                  activeTab === key
                    ? 'text-purple'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon size={14} />
                {label}
                {generatedDocs[featureId]?.[key] && (
                  <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
                )}
                {activeTab === key && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-purple shadow-[0_0_6px_rgba(139,124,246,0.4)]" />
                )}
              </button>
            ))}

            <div className="ml-auto pr-3">
              <button
                data-testid="generate-doc-btn"
                onClick={() => handleGenerate(!cachedDoc)}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple text-white text-[12px] font-medium hover:bg-purple/90 transition-colors disabled:opacity-40"
              >
                {generating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : cachedDoc ? (
                  <RefreshCw size={12} />
                ) : (
                  <FileText size={12} />
                )}
                {generating ? 'Generating...' : cachedDoc ? 'Regenerate' : 'Generate'}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 px-5 py-2.5 bg-red-500/5 border-b border-red-500/10">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <p className="text-[12px] text-red-400 flex-1">{error}</p>
              <button
                data-testid="retry-generate-btn"
                onClick={() => handleGenerate(true)}
                className="text-[12px] font-medium text-red-400 hover:text-red-300 px-2.5 py-1 rounded-md bg-red-500/10 hover:bg-red-500/15 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          <div className="p-5">
            {generating && !cachedDoc ? (
              <div className="flex flex-col items-center justify-center py-14">
                <Loader2 size={28} className="text-purple animate-spin mb-3" />
                <p className="text-[13px] text-text-secondary">Generating {DOC_TYPES.find((d) => d.key === activeTab)?.label}...</p>
                <p className="text-[11px] text-text-secondary/50 mt-0.5">This may take 15-30 seconds</p>
              </div>
            ) : cachedDoc ? (
              <div>
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-[14px] font-semibold text-text-primary">{selectedRec.feature_name}</h3>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-purple/10 text-purple uppercase font-mono">
                      {DOC_TYPES.find((d) => d.key === activeTab)?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-secondary font-mono">
                      {new Date(cachedDoc.timestamp).toLocaleString()}
                    </span>
                    <button
                      data-testid="copy-doc-btn"
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.02] transition-colors"
                    >
                      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      data-testid="regenerate-doc-btn"
                      onClick={() => handleGenerate(true)}
                      disabled={generating}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.02] transition-colors disabled:opacity-40"
                    >
                      <RefreshCw size={11} className={generating ? 'animate-spin' : ''} />
                      Regen
                    </button>
                    <button
                      data-testid="download-doc-btn"
                      onClick={handleDownload}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.02] transition-colors"
                    >
                      <Download size={11} />
                      .md
                    </button>
                  </div>
                </div>

                <div className="max-w-[720px] mx-auto">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {cachedDoc.content}
                  </ReactMarkdown>
                </div>

                {evidence.length > 0 && (
                  <div className="mt-7 pt-5 border-t border-border max-w-[720px] mx-auto">
                    <button
                      data-testid="evidence-toggle"
                      onClick={() => setEvidenceOpen(!evidenceOpen)}
                      className="flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-purple transition-colors"
                    >
                      <Quote size={13} />
                      Evidence Used ({evidence.length} quotes)
                      {evidenceOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {evidenceOpen && (
                      <div className="mt-2 space-y-1.5 pl-3 border-l border-purple/20">
                        {evidence.map((q, i) => (
                          <p key={i} className="text-[11px] text-text-secondary italic leading-relaxed">"{q}"</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <FileText size={32} className="text-text-secondary/10 mb-2.5" />
                <p className="text-[13px] text-text-secondary mb-0.5">
                  No {DOC_TYPES.find((d) => d.key === activeTab)?.label} generated yet
                </p>
                <p className="text-[11px] text-text-secondary/50">
                  Click "Generate" to create this document
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {Object.keys(generatedDocs).some((fId) => Object.keys(generatedDocs[fId] || {}).length > 0) && (
        <div className="flex justify-end">
          <button
            data-testid="goto-assignments-btn"
            onClick={() => {
              updatePipelineStatus('assign', 'active')
              navigate('/assignments')
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple text-white text-[13px] font-semibold hover:bg-purple/90 transition-all glow-btn"
          >
            <Users size={16} />
            Assign to Team
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
