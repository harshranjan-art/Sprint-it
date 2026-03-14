import { useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext'
import { Cloud, HardDrive } from 'lucide-react'

const typeColors = {
  data_ingested: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500', line: 'bg-teal-200' },
  analysis_started: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple', line: 'bg-purple-200' },
  themes_found: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple', line: 'bg-purple-200' },
  recommendations_made: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple', line: 'bg-purple-200' },
  doc_generated: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber', line: 'bg-amber-200' },
  task_assigned: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', line: 'bg-blue-200' },
  session_started: { bg: 'bg-gray-50', text: 'text-text-secondary', dot: 'bg-gray-400', line: 'bg-gray-200' },
}

const defaultColor = { bg: 'bg-gray-50', text: 'text-text-secondary', dot: 'bg-gray-400', line: 'bg-gray-200' }

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
    <div className="bg-bg-card rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Activity Feed</h3>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            s2Persisted
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-50 text-text-secondary'
          }`}
        >
          {s2Persisted ? (
            <Cloud size={12} />
          ) : (
            <HardDrive size={12} />
          )}
          {s2Persisted ? 'Persisted to S2' : 'Local only'}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-5 py-4 max-h-[480px]">
        {eventLog.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">
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
                  className="flex gap-3 pb-4 animate-[fadeIn_0.3s_ease-in-out]"
                >
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
                    {!isLast && (
                      <div className={`w-px flex-1 mt-1 ${colors.line}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${colors.bg} ${colors.text}`}
                      >
                        {typeLabel(event.type)}
                      </span>
                      <span className="text-[11px] text-text-secondary">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed">
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
