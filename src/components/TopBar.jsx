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
    <div className="flex items-center justify-between px-8 py-5 border-b border-border bg-white">
      <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>

      {/* Pipeline progress */}
      <div className="flex items-center gap-1">
        {pipelineSteps.map((step, i) => {
          const status = pipelineStatus[step.key]
          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                    status === 'complete'
                      ? 'bg-purple border-purple'
                      : status === 'active'
                        ? 'bg-amber border-amber'
                        : 'bg-transparent border-gray-300'
                  }`}
                />
                <span className="text-[10px] text-text-secondary mt-1">{step.label}</span>
              </div>
              {i < pipelineSteps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mb-4 mx-0.5 ${
                    pipelineStatus[pipelineSteps[i + 1].key] === 'complete' ||
                    pipelineStatus[step.key] === 'complete'
                      ? 'bg-purple'
                      : 'bg-gray-200'
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
