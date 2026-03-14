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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white border-2 border-black p-8 w-full max-w-md mx-4 animate-[slideUp_0.3s_ease-out]">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.png" alt="Sprint It" className="w-10 h-10 rounded" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-black">Running Pipeline</h3>
            <p className="text-xs text-text-secondary">
              Step {Math.min(step + 1, STEP_LABELS.length)} of {STEP_LABELS.length}
            </p>
          </div>
        </div>

        <p className="text-base font-bold text-purple mb-4">
          {error ? 'Pipeline error' : STEP_LABELS[step] || 'Finishing up...'}
        </p>

        {/* Progress bar */}
        <div className="h-2 bg-neutral-100 overflow-hidden mb-4">
          <div
            className="h-full bg-purple transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex justify-between mb-4">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 transition-colors ${
                i < step ? 'bg-purple' : i === step ? 'bg-gold' : 'bg-neutral-200'
              }`}
            />
          ))}
        </div>

        <div className="text-center">
          <span className="text-sm font-bold text-text-secondary">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </span>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border-2 border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
