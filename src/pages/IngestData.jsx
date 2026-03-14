import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  FileText,
  Globe,
  Plus,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  ChevronRight,
  Database,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { generateMockFeedback } from '../services/mockData'
import { parseFile, extractFeedbackWithLLM } from '../services/unsiloedService'
import { enrichCompany } from '../services/crustdataService'

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
]

const FORMAT_BADGES = ['PDF', 'XLSX', 'CSV', 'DOCX', 'PPTX', 'PNG', 'JPG']

const SUGGESTED_COMPETITORS = [
  'productboard.com',
  'aha.io',
  'dovetailapp.com',
  'notion.so',
]

const sentimentColors = {
  positive: { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
  negative: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  neutral: { dot: 'bg-gray-400', text: 'text-text-secondary', bg: 'bg-gray-50' },
}

const categoryColors = {
  feature_request: 'bg-purple-50 text-purple-700',
  bug_report: 'bg-red-50 text-red-700',
  complaint: 'bg-amber-50 text-amber-700',
  praise: 'bg-green-50 text-green-700',
}

function formatCategory(cat) {
  return cat.replace(/_/g, ' ')
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ─── Feedback Stats ─────────────────────────────────────────────────────────

function FeedbackStats({ data }) {
  const sourceCount = {}
  const segmentCount = {}
  const sentimentCount = { positive: 0, negative: 0, neutral: 0 }

  data.forEach((d) => {
    sourceCount[d.source] = (sourceCount[d.source] || 0) + 1
    segmentCount[d.customer_segment] = (segmentCount[d.customer_segment] || 0) + 1
    sentimentCount[d.sentiment] = (sentimentCount[d.sentiment] || 0) + 1
  })

  const maxSource = Math.max(...Object.values(sourceCount), 1)
  const maxSegment = Math.max(...Object.values(segmentCount), 1)

  const sourceColors = { zendesk: 'bg-purple', intercom: 'bg-blue-500', survey: 'bg-amber', slack: 'bg-green-500' }
  const segmentColors = { enterprise: 'bg-purple', smb: 'bg-blue-500', free: 'bg-amber' }

  return (
    <div className="mt-6 space-y-5">
      {/* Total count */}
      <div className="flex items-center gap-4">
        <span className="text-4xl font-bold text-purple">{data.length}</span>
        <span className="text-sm text-text-secondary">feedback entries loaded</span>
      </div>

      {/* Source breakdown */}
      <div>
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">By Source</p>
        <div className="space-y-1.5">
          {Object.entries(sourceCount).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
            <div key={source} className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-16 capitalize">{source}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${sourceColors[source] || 'bg-gray-400'}`}
                  style={{ width: `${(count / maxSource) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-text-primary w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Segment breakdown */}
      <div>
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">By Segment</p>
        <div className="space-y-1.5">
          {Object.entries(segmentCount).sort((a, b) => b[1] - a[1]).map(([seg, count]) => (
            <div key={seg} className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-16 capitalize">{seg}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${segmentColors[seg] || 'bg-gray-400'}`}
                  style={{ width: `${(count / maxSegment) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-text-primary w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sentiment */}
      <div>
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">Sentiment</p>
        <div className="flex gap-3">
          {Object.entries(sentimentCount).map(([sent, count]) => {
            const colors = sentimentColors[sent]
            return (
              <div key={sent} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${colors.bg}`}>
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <span className={`text-xs font-medium ${colors.text} capitalize`}>{sent}</span>
                <span className={`text-xs font-semibold ${colors.text}`}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent entries */}
      <div>
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">Recent Entries</p>
        <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
          {data.slice(0, 10).map((entry) => {
            const sentColors = sentimentColors[entry.sentiment]
            return (
              <div key={entry.id} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${sentColors.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary leading-snug line-clamp-2">{entry.feedback_text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${categoryColors[entry.category]}`}>
                      {formatCategory(entry.category)}
                    </span>
                    <span className="text-[10px] text-text-secondary">{entry.customer_name.split(',')[0]}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Competitor Card ────────────────────────────────────────────────────────

function CompetitorCard({ company, onRemove }) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">{company.name}</h4>
          <p className="text-xs text-text-secondary">{company.domain}</p>
        </div>
        <button onClick={onRemove} className="text-text-secondary hover:text-red-500 transition-colors p-0.5">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-text-secondary">Headcount</p>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold">
              {company.headcount ? company.headcount.toLocaleString() : '—'}
            </span>
            {company.headcount_yoy != null && (
              <span className={`text-[10px] font-medium ${company.headcount_yoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {company.headcount_yoy >= 0 ? '↑' : '↓'}{Math.abs(company.headcount_yoy)}%
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Funding</p>
          <p className="text-sm font-semibold">{company.funding_total || '—'}</p>
          <p className="text-[10px] text-text-secondary">{company.last_round}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-1.5">
          <span className="text-green-500 text-xs mt-0.5">+</span>
          <p className="text-xs text-text-secondary leading-snug">{company.strength}</p>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-red-500 text-xs mt-0.5">−</span>
          <p className="text-xs text-text-secondary leading-snug">{company.weakness}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function IngestData() {
  const { feedbackData, competitorData, updateState, updatePipelineStatus, addEvent } = useAppContext()
  const navigate = useNavigate()

  // File upload state
  const [files, setFiles] = useState([])
  const [fileStatuses, setFileStatuses] = useState({}) // filename -> 'processing' | 'done' | 'error'
  const [dragOver, setDragOver] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)
  const fileInputRef = useRef(null)

  // Competitor state
  const [domainInput, setDomainInput] = useState('')
  const [loadingDomains, setLoadingDomains] = useState({}) // domain -> true

  const hasFeedback = feedbackData.length > 0

  // ── File handling ──

  const processFiles = useCallback(async (fileList) => {
    const newFiles = Array.from(fileList).filter((f) =>
      ACCEPTED_TYPES.includes(f.type) || f.name.endsWith('.csv')
    )
    if (!newFiles.length) return

    setFiles((prev) => [...prev, ...newFiles])

    for (const file of newFiles) {
      setFileStatuses((prev) => ({ ...prev, [file.name]: 'processing' }))

      try {
        const parsed = await parseFile(file)
        const entries = await extractFeedbackWithLLM(parsed)

        if (entries.length > 0) {
          updateState({ feedbackData: [...feedbackData, ...entries] })
          updatePipelineStatus('ingest', 'complete')
          await addEvent('data_ingested', {
            feedbackCount: entries.length,
            source: file.name,
          }, `Parsed ${entries.length} feedback entries from ${file.name}`)
        }

        setFileStatuses((prev) => ({ ...prev, [file.name]: 'done' }))
      } catch {
        setFileStatuses((prev) => ({ ...prev, [file.name]: 'error' }))
      }
    }
  }, [feedbackData, updateState, updatePipelineStatus, addEvent])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    processFiles(e.dataTransfer.files)
  }, [processFiles])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  // ── Sample data ──

  const loadSampleData = useCallback(async () => {
    setLoadingSample(true)
    // Small delay for visual feedback
    await new Promise((r) => setTimeout(r, 600))

    const data = generateMockFeedback(150)
    updateState({ feedbackData: data })
    updatePipelineStatus('ingest', 'complete')
    await addEvent('data_ingested', {
      feedbackCount: data.length,
      competitorCount: competitorData.length,
    }, `Loaded ${data.length} sample feedback entries`)

    setLoadingSample(false)
  }, [updateState, updatePipelineStatus, addEvent, competitorData.length])

  // ── Competitor handling ──

  const addCompetitor = useCallback(async (domain) => {
    const normalized = domain.toLowerCase().trim()
    if (!normalized || competitorData.find((c) => c.domain === normalized)) return

    setLoadingDomains((prev) => ({ ...prev, [normalized]: true }))

    const company = await enrichCompany(normalized)
    updateState({ competitorData: [...competitorData, company] })
    setLoadingDomains((prev) => ({ ...prev, [normalized]: false }))
    setDomainInput('')
  }, [competitorData, updateState])

  const removeCompetitor = useCallback((domain) => {
    updateState({ competitorData: competitorData.filter((c) => c.domain !== domain) })
  }, [competitorData, updateState])

  const handleDomainSubmit = (e) => {
    e.preventDefault()
    if (domainInput.trim()) addCompetitor(domainInput.trim())
  }

  // ── Navigate to analysis ──

  const runAnalysis = async () => {
    await addEvent('data_ingested', {
      feedbackCount: feedbackData.length,
      competitorCount: competitorData.length,
    }, `Ingestion complete: ${feedbackData.length} feedback + ${competitorData.length} competitors`)
    updatePipelineStatus('analysis', 'active')
    navigate('/analysis')
  }

  return (
    <div className="space-y-6">
      {/* Two cards side by side */}
      <div className="grid grid-cols-2 gap-6">

        {/* ── Card 1: Customer Intelligence ── */}
        <div className="bg-bg-card rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-semibold text-text-primary">Customer Intelligence</h2>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-light text-purple">
              Unsiloed
            </span>
          </div>
          <p className="text-sm text-text-secondary mb-5">
            Upload customer research, survey exports, interview transcripts, support ticket dumps,
            NPS reports — any format
          </p>

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-purple bg-[rgba(124,107,240,0.05)]'
                : 'border-border hover:border-purple hover:bg-[rgba(124,107,240,0.03)]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(',')}
              className="hidden"
              onChange={(e) => processFiles(e.target.files)}
            />
            <Upload size={28} className={`mx-auto mb-3 ${dragOver ? 'text-purple' : 'text-text-secondary'}`} />
            <p className="text-sm font-medium text-text-primary mb-1">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-text-secondary">
              Drag & drop your feedback files for AI-powered extraction
            </p>
          </div>

          {/* Format badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {FORMAT_BADGES.map((fmt) => (
              <span key={fmt} className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-text-secondary">
                {fmt}
              </span>
            ))}
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f) => {
                const status = fileStatuses[f.name]
                return (
                  <div key={f.name} className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 rounded-lg">
                    <FileText size={14} className="text-text-secondary shrink-0" />
                    <span className="text-sm text-text-primary flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-text-secondary">{formatSize(f.size)}</span>
                    {status === 'processing' && <Loader2 size={14} className="text-purple animate-spin" />}
                    {status === 'done' && <CheckCircle2 size={14} className="text-green-500" />}
                    {status === 'error' && <AlertCircle size={14} className="text-red-500" />}
                  </div>
                )
              })}
            </div>
          )}

          {/* Load Sample Data */}
          <button
            onClick={loadSampleData}
            disabled={loadingSample}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-purple text-purple text-sm font-medium hover:bg-purple-light transition-colors disabled:opacity-50"
          >
            {loadingSample ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Database size={16} />
            )}
            {loadingSample ? 'Loading...' : 'Load Sample Data (150 entries)'}
          </button>

          {/* Stats (when data loaded) */}
          {hasFeedback && <FeedbackStats data={feedbackData} />}
        </div>

        {/* ── Card 2: Competitive Intelligence ── */}
        <div className="bg-bg-card rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-semibold text-text-primary">Competitive Intelligence</h2>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-light text-purple">
              Crustdata
            </span>
          </div>
          <p className="text-sm text-text-secondary mb-5">
            Add competitor domains — we'll pull real-time headcount, funding, growth, and signals
          </p>

          {/* Domain input */}
          <form onSubmit={handleDomainSubmit} className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. productboard.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple/20 bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={!domainInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-purple text-white text-sm font-medium hover:bg-purple/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus size={16} />
              Add
            </button>
          </form>

          {/* Suggested competitors */}
          <div className="mb-5">
            <p className="text-xs text-text-secondary mb-2">Suggested competitors</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_COMPETITORS.map((domain) => {
                const alreadyAdded = competitorData.find((c) => c.domain === domain)
                const loading = loadingDomains[domain]
                return (
                  <button
                    key={domain}
                    onClick={() => addCompetitor(domain)}
                    disabled={!!alreadyAdded || loading}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      alreadyAdded
                        ? 'border-green-200 bg-green-50 text-green-700 cursor-default'
                        : 'border-border hover:border-purple hover:text-purple cursor-pointer'
                    }`}
                  >
                    {loading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : alreadyAdded ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <Plus size={12} />
                    )}
                    {domain}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Competitor cards */}
          {competitorData.length > 0 && (
            <div className="space-y-3">
              {competitorData.map((company) => (
                <CompetitorCard
                  key={company.domain}
                  company={company}
                  onRemove={() => removeCompetitor(company.domain)}
                />
              ))}
            </div>
          )}

          {competitorData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe size={32} className="text-text-secondary/30 mb-3" />
              <p className="text-sm text-text-secondary">
                Add competitor domains to pull intelligence
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary Bar ── */}
      <div className="bg-bg-card rounded-2xl border border-border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {hasFeedback ? (
              <CheckCircle2 size={18} className="text-green-500" />
            ) : (
              <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300" />
            )}
            <span className="text-sm text-text-primary">
              <span className="font-semibold">{feedbackData.length}</span> feedback entries
            </span>
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            {competitorData.length > 0 ? (
              <CheckCircle2 size={18} className="text-green-500" />
            ) : (
              <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300" />
            )}
            <span className="text-sm text-text-primary">
              <span className="font-semibold">{competitorData.length}</span> competitors analyzed
            </span>
          </div>
        </div>

        <button
          onClick={runAnalysis}
          disabled={!hasFeedback}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(124,107,240,0.3)]"
        >
          <Sparkles size={16} />
          Run AI Analysis
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
