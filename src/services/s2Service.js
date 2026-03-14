const S2_TOKEN = import.meta.env.VITE_S2_TOKEN
const S2_BASIN = import.meta.env.VITE_S2_BASIN || 'sprint-it'
const BASE_URL = `https://${S2_BASIN}.b.aws.s2.dev/v1`

function isTokenConfigured() {
  return !!S2_TOKEN && !S2_TOKEN.startsWith('your_')
}

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${S2_TOKEN}`,
    'Content-Type': 'application/json',
    's2-format': 'raw',
    ...extra,
  }
}

let currentStreamName = null
let s2Available = false
let localEventLog = []

/**
 * Create a new stream for this Sprint It session.
 * Falls back to in-memory eventLog if S2 is unavailable.
 */
export async function initStream() {
  const timestamp = Date.now()
  currentStreamName = `session-${timestamp}`
  localEventLog = []

  if (!isTokenConfigured()) {
    console.warn('[S2] No valid token configured — using local-only event log')
    s2Available = false
    return { stream: currentStreamName, persisted: false }
  }

  try {
    const res = await fetch(`${BASE_URL}/streams`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ stream: currentStreamName }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `HTTP ${res.status}`)
    }

    const data = await res.json()
    s2Available = true
    console.info(`[S2] Stream created: ${data.name}`)
    return { stream: data.name, persisted: true }
  } catch (err) {
    console.warn(`[S2] Stream creation failed, falling back to local: ${err.message}`)
    s2Available = false
    return { stream: currentStreamName, persisted: false }
  }
}

/**
 * Append an event to the S2 stream (and always to local log).
 */
export async function logEvent(eventType, data = {}, summary = '') {
  const event = {
    timestamp: new Date().toISOString(),
    type: eventType,
    summary,
    data,
  }

  // Always push to local log
  localEventLog.push(event)

  if (s2Available && currentStreamName) {
    try {
      const res = await fetch(`${BASE_URL}/streams/${currentStreamName}/records`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          records: [{ body: JSON.stringify(event) }],
        }),
      })

      if (!res.ok) {
        console.warn(`[S2] Append failed: HTTP ${res.status}`)
      }
    } catch (err) {
      console.warn(`[S2] Append failed: ${err.message}`)
    }
  }

  return event
}

/**
 * Read the full event history from the S2 stream, or return local log.
 */
export async function getEventHistory() {
  if (!s2Available || !currentStreamName) {
    return [...localEventLog]
  }

  try {
    const res = await fetch(
      `${BASE_URL}/streams/${currentStreamName}/records?seq_num=0&count=1000`,
      { headers: headers() }
    )

    if (!res.ok) {
      return [...localEventLog]
    }

    const batch = await res.json()
    if (batch?.records?.length) {
      return batch.records.map((r) => {
        try {
          return JSON.parse(r.body)
        } catch {
          return { timestamp: new Date().toISOString(), type: 'unknown', summary: r.body, data: {} }
        }
      })
    }

    return [...localEventLog]
  } catch {
    return [...localEventLog]
  }
}

/**
 * Get stream metadata — record count via tail sequence number.
 */
export async function getStreamInfo() {
  const info = {
    streamName: currentStreamName,
    persisted: s2Available,
    localCount: localEventLog.length,
    remoteCount: null,
  }

  if (!s2Available || !currentStreamName) {
    return info
  }

  try {
    const res = await fetch(
      `${BASE_URL}/streams/${currentStreamName}/records/tail`,
      { headers: headers() }
    )

    if (res.ok) {
      const tail = await res.json()
      info.remoteCount = tail.next_seq_num ?? tail.seq_num ?? null
    }
  } catch {
    // ignore — remoteCount stays null
  }

  return info
}

/**
 * Get local event log directly (for sync reads without async).
 */
export function getLocalEventLog() {
  return localEventLog
}

/**
 * Check if S2 persistence is active.
 */
export function isS2Available() {
  return s2Available
}
