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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div data-testid="pipeline-overlay" className="bg-bg-card rounded-xl border border-border shadow-2xl p-7 w-full max-w-md mx-4 animate-[slideUp_0.3s_ease-out]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-purple/20 border border-purple/30 flex items-center justify-center">
            <Loader2 size={18} className="text-purple animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Running Full Pipeline</h3>
            <p className="text-[11px] text-text-secondary font-mono">
              Step {Math.min(step + 1, STEP_LABELS.length)} / {STEP_LABELS.length}
            </p>
          </div>
        </div>

        <p className="text-[13px] font-medium text-purple mb-4">
          {error ? 'Pipeline error' : STEP_LABELS[step] || 'Finishing up...'}
        </p>

        <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-purple rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(139,124,246,0.4)]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex justify-between mb-4">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i < step ? 'bg-purple shadow-[0_0_4px_rgba(139,124,246,0.5)]' : i === step ? 'bg-amber shadow-[0_0_4px_rgba(251,191,36,0.5)]' : 'bg-white/8'
              }`}
            />
          ))}
        </div>

        <div className="text-center">
          <span className="text-[11px] text-text-secondary font-mono">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </span>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-[12px] text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
