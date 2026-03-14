const GROQ_KEY = () => import.meta.env.VITE_GROQ_KEY
const GROQ_MODEL = 'llama-3.3-70b-versatile'

function safeParseJSON(text) {
  // Strip markdown code fences if present
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  // Try to find the JSON object or array
  const objMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objMatch) {
    return JSON.parse(objMatch[0])
  }
  const arrMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    return JSON.parse(arrMatch[0])
  }
  return JSON.parse(cleaned)
}

async function callLLM(systemPrompt, userMessage) {
  const key = GROQ_KEY()
  if (!key || key.startsWith('your_')) {
    throw new Error('Groq API key not configured. Add VITE_GROQ_KEY to your .env file.')
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 8192,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
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

// ─── Call 1: Theme Discovery ────────────────────────────────────────────────

export async function discoverThemes(feedbackData) {
  const systemPrompt = `You are Sprint It, an AI product management agent. You're analyzing customer feedback to discover the most important themes and pain points.

Analyze ALL the feedback entries provided. For each theme you discover:
1. Give it a clear, actionable name (not vague like "usability issues" — specific like "Onboarding flow causes drop-off in first 5 minutes")
2. Count how many entries relate to this theme
3. Assess severity based on language intensity and segment impact
4. Pull exact quotes as evidence

Return ONLY valid JSON, no markdown fences, no preamble:
{
  "themes": [{
    "name": string,
    "description": string (2-3 sentences explaining the problem),
    "frequency": number (how many entries mention this),
    "severity": "critical" | "high" | "medium" | "low",
    "segments_affected": string[] (which customer segments),
    "representative_quotes": string[] (max 3, exact text from entries),
    "category": "feature_gap" | "bug" | "ux_friction" | "competitive_pressure" | "praise",
    "estimated_revenue_impact": "high" | "medium" | "low"
  }]
}`

  const userMessage = `Here are ${feedbackData.length} customer feedback entries to analyze:\n\n${JSON.stringify(feedbackData, null, 2)}`

  return callLLM(systemPrompt, userMessage)
}

// ─── Call 2: Competitive Gap Analysis ───────────────────────────────────────

export async function analyzeGaps(themes, competitorData) {
  const systemPrompt = `You are Sprint It, an AI product management agent. You're analyzing how our product (Sprint It — AI-native PM tool) compares to competitors based on customer feedback themes and competitor company data.

For each significant gap or opportunity:
1. Identify the capability area
2. Assess where we stand vs each competitor
3. Rate the strategic opportunity

Return ONLY valid JSON, no markdown fences, no preamble:
{
  "gaps": [{
    "area": string (the capability),
    "our_status": "strong" | "building" | "weak" | "missing",
    "competitors": [{ "name": string, "status": string }],
    "opportunity": "high" | "medium" | "low",
    "insight": string (1-2 sentences on what this means)
  }],
  "market_position": string (2-3 sentence summary of our position),
  "biggest_threat": string,
  "biggest_opportunity": string
}`

  const userMessage = `Themes discovered from customer feedback:\n${JSON.stringify(themes, null, 2)}\n\nCompetitor data:\n${JSON.stringify(competitorData, null, 2)}`

  return callLLM(systemPrompt, userMessage)
}

// ─── Call 3: Prioritized Recommendations ────────────────────────────────────

export async function generateRecommendations(themes, gaps, competitorData, weights) {
  const systemPrompt = `You are Sprint It, an AI product management agent. Based on the customer feedback themes, competitive gaps, and market analysis, decide what should be built next.

You are making the actual product decision — not suggesting options for a human to pick from. State your recommendation with conviction and evidence. For each item, explain WHY it should be built and what happens if we don't build it.

Priority scoring weights (0-100, provided by the PM):
- User Impact: ${weights.userImpact}
- Revenue Impact: ${weights.revenueImpact}
- Effort (inverse — lower effort scores higher): ${weights.effort}
- Strategic Alignment: ${weights.strategicAlignment}

Compute priority_score as: (user_impact * ${weights.userImpact} + revenue_impact * ${weights.revenueImpact} + (10 - effort) * ${weights.effort} + strategic_alignment * ${weights.strategicAlignment}) / ${weights.userImpact + weights.revenueImpact + weights.effort + weights.strategicAlignment} * 10, rounded to 1 decimal.

Return ONLY valid JSON, no markdown fences, no preamble:
{
  "recommendations": [{
    "rank": number,
    "feature_name": string,
    "description": string (what to build, specifically),
    "rationale": string (why this, why now — cite specific evidence),
    "user_impact": number (1-10),
    "revenue_impact": number (1-10),
    "effort": number (1-10, higher = more effort),
    "strategic_alignment": number (1-10),
    "priority_score": number (computed weighted score),
    "target_segment": string,
    "evidence": string[] (specific customer quotes or data points),
    "competitive_context": string (what competitors are doing here),
    "risk_if_delayed": string (what happens if we don't build this)
  }],
  "summary": string (2-3 sentence executive summary of the strategy)
}`

  const userMessage = `Themes:\n${JSON.stringify(themes, null, 2)}\n\nCompetitive gaps:\n${JSON.stringify(gaps, null, 2)}\n\nCompetitor data:\n${JSON.stringify(competitorData, null, 2)}\n\nWeights: ${JSON.stringify(weights)}`

  return callLLM(systemPrompt, userMessage)
}
