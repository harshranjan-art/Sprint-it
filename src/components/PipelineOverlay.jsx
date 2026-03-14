import { Loader2 } from 'lucide-react'

const STEP_LABELS = [
  'Loading data...',
  'Analyzing themes...',
  'Finding gaps...',
  'Generating recommendations...',
  'Writing PRD...',
  'Assigning engineers...',
]

export default function PipelineOverlay({ step, elapsed, error }) {
  const progressPct = ((step + 1) / STEP_LABELS.length) * 100

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-border shadow-2xl p-8 w-full max-w-md mx-4 animate-[slideUp_0.3s_ease-out]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-purple flex items-center justify-center">
            <Loader2 size={20} className="text-white animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Running Full Pipeline</h3>
            <p className="text-xs text-text-secondary">
              Step {Math.min(step + 1, STEP_LABELS.length)} of {STEP_LABELS.length}
            </p>
          </div>
        </div>

        {/* Current step */}
        <p className="text-sm font-medium text-purple mb-4">
          {error ? 'Pipeline error' : STEP_LABELS[step] || 'Finishing up...'}
        </p>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-purple rounded-full transition-all duration-700 ease-out"
            style={{ width: `${error ? progressPct : progressPct}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between mb-4">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < step ? 'bg-purple' : i === step ? 'bg-amber' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Elapsed time */}
        <div className="text-center">
          <span className="text-xs text-text-secondary">
            Elapsed: {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
