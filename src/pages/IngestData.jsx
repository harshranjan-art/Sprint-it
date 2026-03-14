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
  positive: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  negative: { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10' },
  neutral: { dot: 'bg-white/30', text: 'text-text-secondary', bg: 'bg-white/5' },
}

const categoryColors = {
  feature_request: 'bg-purple/10 text-purple',
  bug_report: 'bg-red-500/10 text-red-400',
  complaint: 'bg-amber/10 text-amber',
  praise: 'bg-emerald-500/10 text-emerald-400',
}

function formatCategory(cat) {
  return cat.replace(/_/g, ' ')
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

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

  const sourceColors = { zendesk: 'bg-purple', intercom: 'bg-blue-400', survey: 'bg-amber', slack: 'bg-emerald-400' }
  const segmentColors = { enterprise: 'bg-purple', smb: 'bg-blue-400', free: 'bg-amber' }

  return (
    <div className="mt-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-purple font-mono">{data.length}</span>
        <span className="text-[13px] text-text-secondary">feedback entries loaded</span>
      </div>

      <div>
        <p className="text-[10px] font-medium text-text-secondary/60 uppercase tracking-widest mb-1.5">By Source</p>
        <div className="space-y-1">
          {Object.entries(sourceCount).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
            <div key={source} className="flex items-center gap-2">
              <span className="text-[11px] text-text-secondary w-14 capitalize">{source}</span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${sourceColors[source] || 'bg-white/20'}`}
                  style={{ width: `${(count / maxSource) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-text-primary w-6 text-right font-mono">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-medium text-text-secondary/60 uppercase tracking-widest mb-1.5">By Segment</p>
        <div className="space-y-1">
          {Object.entries(segmentCount).sort((a, b) => b[1] - a[1]).map(([seg, count]) => (
            <div key={seg} className="flex items-center gap-2">
              <span className="text-[11px] text-text-secondary w-14 capitalize">{seg}</span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${segmentColors[seg] || 'bg-white/20'}`}
                  style={{ width: `${(count / maxSegment) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-text-primary w-6 text-right font-mono">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-medium text-text-secondary/60 uppercase tracking-widest mb-1.5">Sentiment</p>
        <div className="flex gap-2">
          {Object.entries(sentimentCount).map(([sent, count]) => {
            const colors = sentimentColors[sent]
            return (
              <div key={sent} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${colors.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                <span className={`text-[11px] font-medium ${colors.text} capitalize`}>{sent}</span>
                <span className={`text-[11px] font-semibold ${colors.text} font-mono`}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-medium text-text-secondary/60 uppercase tracking-widest mb-1.5">Recent Entries</p>
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {data.slice(0, 10).map((entry) => {
            const sentColors = sentimentColors[entry.sentiment]
            return (
              <div key={entry.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${sentColors.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-text-primary/80 leading-snug line-clamp-2">{entry.feedback_text}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded capitalize ${categoryColors[entry.category]}`}>
                      {formatCategory(entry.category)}
                    </span>
                    <span className="text-[9px] text-text-secondary">{entry.customer_name.split(',')[0]}</span>
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

function CompetitorCard({ company, onRemove }) {
  return (
    <div data-testid={`competitor-card-${company.domain}`} className="bg-bg-elevated rounded-lg border border-border p-3.5 card-glow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-[13px] font-semibold text-text-primary">{company.name}</h4>
          <p className="text-[11px] text-text-secondary font-mono">{company.domain}</p>
        </div>
        <button data-testid={`remove-competitor-${company.domain}`} onClick={onRemove} className="text-text-secondary hover:text-red-400 transition-colors p-0.5">
          <X size={13} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <div>
          <p className="text-[10px] text-text-secondary">Headcount</p>
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-semibold font-mono">
              {company.headcount ? company.headcount.toLocaleString() : '--'}
            </span>
            {company.headcount_yoy != null && (
              <span className={`text-[9px] font-medium ${company.headcount_yoy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {company.headcount_yoy >= 0 ? '+' : ''}{company.headcount_yoy}%
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-text-secondary">Funding</p>
          <p className="text-[13px] font-semibold font-mono">{company.funding_total || '--'}</p>
          <p className="text-[9px] text-text-secondary">{company.last_round}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-start gap-1.5">
          <span className="text-emerald-400 text-[11px] mt-0.5">+</span>
          <p className="text-[11px] text-text-secondary leading-snug">{company.strength}</p>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-red-400 text-[11px] mt-0.5">-</span>
          <p className="text-[11px] text-text-secondary leading-snug">{company.weakness}</p>
        </div>
      </div>
    </div>
  )
}

export default function IngestData() {
  const { feedbackData, competitorData, updateState, updatePipelineStatus, addEvent } = useAppContext()
  const navigate = useNavigate()

  const [files, setFiles] = useState([])
  const [fileStatuses, setFileStatuses] = useState({})
  const [dragOver, setDragOver] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)
  const fileInputRef = useRef(null)

  const [domainInput, setDomainInput] = useState('')
  const [loadingDomains, setLoadingDomains] = useState({})

  const hasFeedback = feedbackData.length > 0

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

  const loadSampleData = useCallback(async () => {
    setLoadingSample(true)
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

  const runAnalysis = async () => {
    await addEvent('data_ingested', {
      feedbackCount: feedbackData.length,
      competitorCount: competitorData.length,
    }, `Ingestion complete: ${feedbackData.length} feedback + ${competitorData.length} competitors`)
    updatePipelineStatus('analysis', 'active')
    navigate('/analysis')
  }

  return (
    <div data-testid="ingest-page" className="space-y-5">
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-5">

        <div className="bg-bg-card rounded-xl border border-border p-5 card-glow">
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-base font-semibold text-text-primary">Customer Intelligence</h2>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-purple/10 text-purple">
              Unsiloed
            </span>
          </div>
          <p className="text-[13px] text-text-secondary mb-4">
            Upload customer research, survey exports, interview transcripts, support ticket dumps
          </p>

          <div
            data-testid="file-dropzone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-purple bg-purple/5'
                : 'border-border hover:border-purple/30 hover:bg-white/[0.01]'
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
            <Upload size={24} className={`mx-auto mb-2 ${dragOver ? 'text-purple' : 'text-text-secondary/40'}`} />
            <p className="text-[13px] font-medium text-text-primary mb-0.5">
              Drop files here or click to browse
            </p>
            <p className="text-[11px] text-text-secondary">
              AI-powered extraction from any document format
            </p>
          </div>

          <div className="flex flex-wrap gap-1 mt-2.5">
            {FORMAT_BADGES.map((fmt) => (
              <span key={fmt} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-text-secondary">
                {fmt}
              </span>
            ))}
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {files.map((f) => {
                const status = fileStatuses[f.name]
                return (
                  <div key={f.name} className="flex items-center gap-2 py-1.5 px-2.5 bg-white/[0.02] rounded-lg border border-border">
                    <FileText size={13} className="text-text-secondary shrink-0" />
                    <span className="text-[12px] text-text-primary flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] text-text-secondary font-mono">{formatSize(f.size)}</span>
                    {status === 'processing' && <Loader2 size={13} className="text-purple animate-spin" />}
                    {status === 'done' && <CheckCircle2 size={13} className="text-emerald-400" />}
                    {status === 'error' && <AlertCircle size={13} className="text-red-400" />}
                  </div>
                )
              })}
            </div>
          )}

          <button
            data-testid="load-sample-btn"
            onClick={loadSampleData}
            disabled={loadingSample}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-purple/30 text-purple text-[13px] font-medium hover:bg-purple/5 transition-colors disabled:opacity-40"
          >
            {loadingSample ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Database size={14} />
            )}
            {loadingSample ? 'Loading...' : 'Load Sample Data (150 entries)'}
          </button>

          {hasFeedback && <FeedbackStats data={feedbackData} />}
        </div>

        <div className="bg-bg-card rounded-xl border border-border p-5 card-glow">
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-base font-semibold text-text-primary">Competitive Intelligence</h2>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-purple/10 text-purple">
              Crustdata
            </span>
          </div>
          <p className="text-[13px] text-text-secondary mb-4">
            Add competitor domains -- we'll pull real-time headcount, funding, growth, and signals
          </p>

          <form onSubmit={handleDomainSubmit} className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                data-testid="competitor-domain-input"
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. productboard.com"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border text-[13px] focus:outline-none focus:border-purple/40 focus:ring-1 focus:ring-purple/10 bg-surface text-text-primary placeholder:text-text-secondary/40"
              />
            </div>
            <button
              data-testid="add-competitor-btn"
              type="submit"
              disabled={!domainInput.trim()}
              className="px-3 py-2 rounded-lg bg-purple text-white text-[13px] font-medium hover:bg-purple/90 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              <Plus size={14} />
              Add
            </button>
          </form>

          <div className="mb-4">
            <p className="text-[10px] text-text-secondary mb-1.5">Suggested competitors</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_COMPETITORS.map((domain) => {
                const alreadyAdded = competitorData.find((c) => c.domain === domain)
                const loading = loadingDomains[domain]
                return (
                  <button
                    key={domain}
                    data-testid={`suggest-${domain}`}
                    onClick={() => addCompetitor(domain)}
                    disabled={!!alreadyAdded || loading}
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors ${
                      alreadyAdded
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 cursor-default'
                        : 'border-border hover:border-purple/30 hover:text-purple cursor-pointer text-text-secondary'
                    }`}
                  >
                    {loading ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : alreadyAdded ? (
                      <CheckCircle2 size={11} />
                    ) : (
                      <Plus size={11} />
                    )}
                    {domain}
                  </button>
                )
              })}
            </div>
          </div>

          {competitorData.length > 0 && (
            <div className="space-y-2.5">
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
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Globe size={28} className="text-text-secondary/15 mb-2" />
              <p className="text-[13px] text-text-secondary">
                Add competitor domains to pull intelligence
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-bg-card rounded-xl border border-border p-4 card-glow flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            {hasFeedback ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : (
              <div className="w-4 h-4 rounded-full border-[1.5px] border-white/15" />
            )}
            <span className="text-[13px] text-text-primary">
              <span className="font-semibold font-mono">{feedbackData.length}</span> feedback entries
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            {competitorData.length > 0 ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : (
              <div className="w-4 h-4 rounded-full border-[1.5px] border-white/15" />
            )}
            <span className="text-[13px] text-text-primary">
              <span className="font-semibold font-mono">{competitorData.length}</span> competitors analyzed
            </span>
          </div>
        </div>

        <button
          data-testid="run-ai-analysis-btn"
          onClick={runAnalysis}
          disabled={!hasFeedback}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple text-white text-[13px] font-semibold hover:bg-purple/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed glow-btn"
        >
          <Sparkles size={14} />
          Run AI Analysis
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
