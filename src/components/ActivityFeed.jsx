import { useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext'
import { Cloud, HardDrive } from 'lucide-react'

const typeColors = {
  data_ingested: { bg: 'bg-teal-500/10', text: 'text-teal-400', dot: 'bg-teal-400', line: 'bg-teal-500/20' },
  analysis_started: { bg: 'bg-purple/10', text: 'text-purple', dot: 'bg-purple', line: 'bg-purple/20' },
  themes_found: { bg: 'bg-purple/10', text: 'text-purple', dot: 'bg-purple', line: 'bg-purple/20' },
  recommendations_made: { bg: 'bg-purple/10', text: 'text-purple', dot: 'bg-purple', line: 'bg-purple/20' },
  doc_generated: { bg: 'bg-amber/10', text: 'text-amber', dot: 'bg-amber', line: 'bg-amber/20' },
  task_assigned: { bg: 'bg-blue-400/10', text: 'text-blue-400', dot: 'bg-blue-400', line: 'bg-blue-400/20' },
  session_started: { bg: 'bg-white/5', text: 'text-text-secondary', dot: 'bg-white/30', line: 'bg-white/8' },
}

const defaultColor = { bg: 'bg-white/5', text: 'text-text-secondary', dot: 'bg-white/30', line: 'bg-white/8' }

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function typeLabel(type) {
  return type.replace(/_/g, ' ')
}

export default function ActivityFeed() {
  const { eventLog, s2Persisted } = useAppContext()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [eventLog.length])

  return (
    <div data-testid="activity-feed" className="bg-bg-card rounded-xl border border-border card-glow flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-[13px] font-semibold text-text-primary">Activity Feed</h3>
        <span
          data-testid="persistence-status"
          className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md ${
            s2Persisted
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-white/5 text-text-secondary'
          }`}
        >
          {s2Persisted ? <Cloud size={10} /> : <HardDrive size={10} />}
          {s2Persisted ? 'Persisted to S2' : 'Local only'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 max-h-[480px]">
        {eventLog.length === 0 ? (
          <p className="text-[13px] text-text-secondary text-center py-8">
            No events yet. Activity will appear here as the pipeline runs.
          </p>
        ) : (
          <div className="relative">
            {eventLog.map((event, i) => {
              const colors = typeColors[event.type] || defaultColor
              const isLast = i === eventLog.length - 1
              return (
                <div
                  key={`${event.timestamp}-${i}`}
                  className="flex gap-2.5 pb-3.5 animate-[fadeIn_0.3s_ease-in-out]"
                >
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                    {!isLast && (
                      <div className={`w-px flex-1 mt-1 ${colors.line}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 -mt-0.5">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span
                        className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${colors.bg} ${colors.text}`}
                      >
                        {typeLabel(event.type)}
                      </span>
                      <span className="text-[10px] text-text-secondary font-mono">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-[12px] text-text-primary/80 leading-relaxed">
                      {event.summary}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  )
}
