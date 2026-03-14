import { createContext, useContext, useEffect, useState } from 'react'
import { initStream, logEvent as s2LogEvent, isS2Available } from '../services/s2Service'

const AppContext = createContext(null)

const initialState = {
  feedbackData: [],
  competitorData: [],
  analysisResults: { themes: [], gaps: [], recommendations: [] },
  generatedDocs: { prd: {}, okrs: {}, onePager: {}, experimentSpec: {} },
  teamAssignments: [],
  pipelineStatus: {
    ingest: 'pending',
    analysis: 'pending',
    docs: 'pending',
    assign: 'pending',
  },
  s2StreamId: null,
  s2Persisted: false,
  eventLog: [],
}

export function AppProvider({ children }) {
  const [state, setState] = useState(initialState)

  // Initialize S2 stream on mount
  useEffect(() => {
    let mounted = true

    async function boot() {
      const result = await initStream()
      if (!mounted) return

      setState((prev) => ({
        ...prev,
        s2StreamId: result.stream,
        s2Persisted: result.persisted,
      }))

      // Log session start event
      const event = await s2LogEvent(
        'session_started',
        { stream: result.stream },
        'Sprint It session initialized'
      )

      if (!mounted) return
      setState((prev) => ({
        ...prev,
        eventLog: [...prev.eventLog, event],
      }))
    }

    boot()
    return () => { mounted = false }
  }, [])

  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  const updatePipelineStatus = (step, status) => {
    setState((prev) => ({
      ...prev,
      pipelineStatus: { ...prev.pipelineStatus, [step]: status },
    }))
  }

  const addEvent = async (eventType, data = {}, summary = '') => {
    const event = await s2LogEvent(eventType, data, summary)
    setState((prev) => ({
      ...prev,
      eventLog: [...prev.eventLog, event],
    }))
    return event
  }

  return (
    <AppContext.Provider
      value={{ ...state, updateState, updatePipelineStatus, addEvent }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
