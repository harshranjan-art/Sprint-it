import { useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext'
import { Cloud, HardDrive } from 'lucide-react'

const typeColors = {
  data_ingested: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500', line: 'bg-teal-200' },
  analysis_started: { bg: 'bg-purple/10', text: 'text-purple', dot: 'bg-purple', line: 'bg-purple/20' },
  themes_found: { bg: 'bg-purple/10', text: 'text-purple', dot: 'bg-purple', line: 'bg-purple/20' },
  recommendations_made: { bg: 'bg-purple/10', text: 'text-purple', dot: 'bg-purple', line: 'bg-purple/20' },
  doc_generated: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-gold', line: 'bg-gold/30' },
  task_assigned: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', line: 'bg-blue-200' },
  session_started: { bg: 'bg-neutral-100', text: 'text-text-secondary', dot: 'bg-neutral-400', line: 'bg-neutral-200' },
}

const defaultColor = { bg: 'bg-neutral-100', text: 'text-text-secondary', dot: 'bg-neutral-400', line: 'bg-neutral-200' }

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
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
    <div className="border-2 border-black h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b-2 border-black">
        <h3 className="text-xs font-bold uppercase tracking-wider text-black">Activity Feed</h3>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 ${
          s2Persisted ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-text-secondary'
        }`}>
          {s2Persisted ? <Cloud size={12} /> : <HardDrive size={12} />}
          {s2Persisted ? 'S2 Synced' : 'Local'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 max-h-[400px]">
        {eventLog.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">
            No events yet. Run the pipeline to see activity.
          </p>
        ) : (
          <div className="relative">
            {eventLog.map((event, i) => {
              const colors = typeColors[event.type] || defaultColor
              const isLast = i === eventLog.length - 1
              return (
                <div key={`${event.timestamp}-${i}`} className="flex gap-3 pb-4 animate-[fadeIn_0.3s_ease-out]">
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
                    {!isLast && <div className={`w-px flex-1 mt-1 ${colors.line}`} />}
                  </div>
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 capitalize ${colors.bg} ${colors.text}`}>
                        {typeLabel(event.type)}
                      </span>
                      <span className="text-xs text-text-muted">{formatTime(event.timestamp)}</span>
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed">{event.summary}</p>
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
