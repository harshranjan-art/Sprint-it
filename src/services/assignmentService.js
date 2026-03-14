const ANTHROPIC_KEY = () => import.meta.env.VITE_ANTHROPIC_KEY

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
  const key = ANTHROPIC_KEY()
  if (!key || key.startsWith('your_')) {
    throw new Error('Anthropic API key not configured. Add VITE_ANTHROPIC_KEY to your .env file.')
  }

  const userMessage = `Feature to assign:
${JSON.stringify(recommendation, null, 2)}

Available engineering team:
${JSON.stringify(team, null, 2)}

Analysis context (themes and gaps):
${JSON.stringify(analysisContext, null, 2)}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Claude API error (${res.status}): ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  return safeParseJSON(text)
}
