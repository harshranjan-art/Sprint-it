const UNSILOED_KEY = import.meta.env.VITE_UNSILOED_KEY
const BASE_URL = 'https://prod.visionapi.unsiloed.ai'

function isConfigured() {
  return !!UNSILOED_KEY && !UNSILOED_KEY.startsWith('your_')
}

/**
 * Upload a file to Unsiloed for parsing.
 * Returns the parsed content (chunks) or throws on failure.
 */
export async function parseFile(file) {
  if (!isConfigured()) {
    throw new Error('Unsiloed API key not configured')
  }

  // Step 1: Upload file
  const formData = new FormData()
  formData.append('file', file)

  const uploadRes = await fetch(`${BASE_URL}/parse`, {
    method: 'POST',
    headers: { 'api-key': UNSILOED_KEY },
    body: formData,
  })

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: HTTP ${uploadRes.status}`)
  }

  const { job_id } = await uploadRes.json()

  // Step 2: Poll for results
  const maxAttempts = 30
  const pollInterval = 2000

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, pollInterval))

    const pollRes = await fetch(`${BASE_URL}/parse/${job_id}`, {
      headers: { 'api-key': UNSILOED_KEY, accept: 'application/json' },
    })

    if (!pollRes.ok) continue

    const result = await pollRes.json()

    if (result.status === 'Succeeded') {
      // Concatenate all chunk text into a single document
      const content = (result.chunks || [])
        .map((c) => c.text || c.content || c.markdown || JSON.stringify(c))
        .join('\n\n')
      return content
    }

    if (result.status === 'Failed') {
      throw new Error('Unsiloed parsing failed')
    }
  }

  throw new Error('Parsing timed out')
}

/**
 * Send parsed content to Groq LLM for structured extraction.
 */
export async function extractFeedbackWithLLM(parsedContent) {
  const GROQ_KEY = import.meta.env.VITE_GROQ_KEY
  if (!GROQ_KEY || GROQ_KEY.startsWith('your_')) {
    throw new Error('Groq API key not configured')
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `Extract individual customer feedback entries from this parsed document. For each entry return: { customer_name, feedback_text, sentiment (positive/negative/neutral), source_type (survey/interview/support_ticket/nps/research), customer_segment (enterprise/smb/free), date (if found, else null), category (feature_request/bug_report/complaint/praise) }. Return as a JSON array only, no other text.\n\nDocument:\n${parsedContent}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`Groq API failed: HTTP ${res.status}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || '[]'

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  const entries = JSON.parse(jsonMatch[0])
  return entries.map((entry, i) => ({
    id: i + 1,
    customer_name: entry.customer_name || 'Unknown',
    feedback_text: entry.feedback_text || '',
    sentiment: entry.sentiment || 'neutral',
    source: entry.source_type || 'survey',
    customer_segment: entry.customer_segment || 'smb',
    date: entry.date || new Date().toISOString().split('T')[0],
    category: entry.category || 'feature_request',
  }))
}
