import { useAppContext } from '../context/AppContext'

const pipelineSteps = [
  { key: 'ingest', label: 'Ingest' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'docs', label: 'Docs' },
  { key: 'assign', label: 'Assign' },
]

export default function TopBar({ title }) {
  const { pipelineStatus } = useAppContext()

  return (
    <div data-testid="top-bar" className="flex items-center justify-between px-8 py-4 border-b border-border bg-bg-card/50 backdrop-blur-sm">
      <h1 className="text-lg font-semibold text-text-primary tracking-tight">{title}</h1>

      <div className="flex items-center gap-1.5">
        {pipelineSteps.map((step, i) => {
          const status = pipelineStatus[step.key]
          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  data-testid={`pipeline-dot-${step.key}`}
                  className={`w-2.5 h-2.5 rounded-full border-[1.5px] transition-all ${
                    status === 'complete'
                      ? 'bg-purple border-purple shadow-[0_0_6px_rgba(139,124,246,0.5)]'
                      : status === 'active'
                        ? 'bg-amber border-amber shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                        : 'bg-transparent border-white/15'
                  }`}
                />
                <span className="text-[9px] text-text-secondary mt-1 font-medium">{step.label}</span>
              </div>
              {i < pipelineSteps.length - 1 && (
                <div
                  className={`w-6 h-px mb-3.5 mx-0.5 ${
                    pipelineStatus[pipelineSteps[i + 1].key] === 'complete' ||
                    pipelineStatus[step.key] === 'complete'
                      ? 'bg-purple/40'
                      : 'bg-white/6'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
