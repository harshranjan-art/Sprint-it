const GROQ_KEY = () => import.meta.env.VITE_GROQ_KEY
const GROQ_MODEL = 'llama-3.3-70b-versatile'

function safeParseJSON(text) {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const objMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objMatch) return JSON.parse(objMatch[0])
  return JSON.parse(cleaned)
}

const SYSTEM_PROMPT = `You are Sprint It, an AI engineering manager. Given a feature to build and the available engineering team, make the optimal assignment.

Consider:
1. Skill match — who has the right technical skills for this feature?
2. Bandwidth — who has capacity this sprint? (lower load = more available)
3. Context — who's already working on related features?
4. Growth — is there a stretch opportunity for someone?

Be decisive. Name specific people and explain why.

Return ONLY valid JSON, no markdown fences:
{
  "primary_assignee": { "id": number, "name": string, "reason": string },
  "supporting_engineer": { "id": number, "name": string, "reason": string } | null,
  "estimated_points": number (1-13, fibonacci),
  "estimated_sprints": number,
  "sprint_fit": string (explanation of timeline),
  "ticket": {
    "title": string,
    "description": string (full ticket description with context, acceptance criteria, and technical notes — this should be ready to paste into Linear/Jira),
    "labels": string[],
    "priority": "urgent" | "high" | "medium" | "low"
  },
  "risks": string[],
  "dependencies": string[]
}`

export async function autoAssign(recommendation, team, analysisContext = {}) {
  const key = GROQ_KEY()
  if (!key || key.startsWith('your_')) {
    throw new Error('Groq API key not configured. Add VITE_GROQ_KEY to your .env file.')
  }

  const userMessage = `Feature to assign:
${JSON.stringify(recommendation, null, 2)}

Available engineering team:
${JSON.stringify(team, null, 2)}

Analysis context (themes and gaps):
${JSON.stringify(analysisContext, null, 2)}`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Groq API error (${res.status}): ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''
  return safeParseJSON(text)
}
