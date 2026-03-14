const GROQ_KEY = () => import.meta.env.VITE_GROQ_KEY
const GROQ_MODEL = 'llama-3.3-70b-versatile'

function safeParseJSON(text) {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const objMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objMatch) return JSON.parse(objMatch[0])
  const arrMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrMatch) return JSON.parse(arrMatch[0])
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
      max_tokens: 4096,
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

// ─── Condense feedback to fit within token limits ───────────────────────────

function condenseFeedback(feedbackData) {
  // Group by category, count sentiments/segments, pick representative quotes
  const byCategory = {}
  feedbackData.forEach((entry) => {
    const cat = entry.category || 'other'
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, sentiments: {}, segments: {}, sources: {}, quotes: [] }
    }
    const g = byCategory[cat]
    g.count++
    g.sentiments[entry.sentiment] = (g.sentiments[entry.sentiment] || 0) + 1
    g.segments[entry.customer_segment] = (g.segments[entry.customer_segment] || 0) + 1
    g.sources[entry.source] = (g.sources[entry.source] || 0) + 1
    // Keep up to 8 diverse quotes per category
    if (g.quotes.length < 8) {
      g.quotes.push(entry.feedback_text)
    }
  })

  const totalCount = feedbackData.length
  const overallSentiment = {}
  const overallSegment = {}
  feedbackData.forEach((e) => {
    overallSentiment[e.sentiment] = (overallSentiment[e.sentiment] || 0) + 1
    overallSegment[e.customer_segment] = (overallSegment[e.customer_segment] || 0) + 1
  })

  let summary = `FEEDBACK SUMMARY (${totalCount} total entries)\n`
  summary += `Overall sentiment: ${JSON.stringify(overallSentiment)}\n`
  summary += `Segments: ${JSON.stringify(overallSegment)}\n\n`

  for (const [cat, data] of Object.entries(byCategory)) {
    summary += `--- ${cat.toUpperCase()} (${data.count} entries) ---\n`
    summary += `Sentiments: ${JSON.stringify(data.sentiments)}\n`
    summary += `Segments: ${JSON.stringify(data.segments)}\n`
    summary += `Sources: ${JSON.stringify(data.sources)}\n`
    summary += `Representative quotes:\n`
    data.quotes.forEach((q) => { summary += `  - "${q}"\n` })
    summary += '\n'
  }

  return summary
}

// ─── Call 1: Theme Discovery ────────────────────────────────────────────────

export async function discoverThemes(feedbackData) {
  const systemPrompt = `You are Sprint It, an AI product management agent analyzing customer feedback to discover themes and pain points.

For each theme:
1. Give it a clear, actionable name (specific, not vague)
2. Count how many entries relate to it (estimate from the provided counts)
3. Assess severity based on language intensity and segment impact
4. Pull exact quotes as evidence

Return ONLY valid JSON:
{
  "themes": [{
    "name": string,
    "description": string (2-3 sentences),
    "frequency": number,
    "severity": "critical" | "high" | "medium" | "low",
    "segments_affected": string[],
    "representative_quotes": string[] (max 3),
    "category": "feature_gap" | "bug" | "ux_friction" | "competitive_pressure" | "praise",
    "estimated_revenue_impact": "high" | "medium" | "low"
  }]
}`

  const condensed = condenseFeedback(feedbackData)
  return callLLM(systemPrompt, condensed)
}

// ─── Call 2: Competitive Gap Analysis ───────────────────────────────────────

export async function analyzeGaps(themes, competitorData) {
  const systemPrompt = `You are Sprint It, an AI PM agent comparing our product (Sprint It — AI-native PM tool) to competitors.

For each gap/opportunity, identify the capability area, assess our status vs competitors, and rate the opportunity.

Return ONLY valid JSON:
{
  "gaps": [{
    "area": string,
    "our_status": "strong" | "building" | "weak" | "missing",
    "competitors": [{ "name": string, "status": string }],
    "opportunity": "high" | "medium" | "low",
    "insight": string (1-2 sentences)
  }],
  "market_position": string (2-3 sentences),
  "biggest_threat": string,
  "biggest_opportunity": string
}`

  // Send only theme names/severity + compact competitor info
  const themesSummary = themes.map((t) => ({
    name: t.name,
    severity: t.severity,
    frequency: t.frequency,
    category: t.category,
  }))
  const compSummary = competitorData.map((c) => ({
    name: c.name,
    domain: c.domain,
    headcount: c.headcount,
    funding: c.funding_total,
    strength: c.strength,
    weakness: c.weakness,
  }))

  const userMessage = `Themes:\n${JSON.stringify(themesSummary, null, 1)}\n\nCompetitors:\n${JSON.stringify(compSummary, null, 1)}`
  return callLLM(systemPrompt, userMessage)
}

// ─── Call 3: Prioritized Recommendations ────────────────────────────────────

export async function generateRecommendations(themes, gaps, competitorData, weights) {
  const systemPrompt = `You are Sprint It, an AI PM agent deciding what to build next. Be decisive — state recommendations with conviction.

Weights: User Impact=${weights.userImpact}, Revenue=${weights.revenueImpact}, Effort(inverse)=${weights.effort}, Strategic=${weights.strategicAlignment}.
Score = (user_impact*${weights.userImpact} + revenue_impact*${weights.revenueImpact} + (10-effort)*${weights.effort} + strategic_alignment*${weights.strategicAlignment}) / ${weights.userImpact + weights.revenueImpact + weights.effort + weights.strategicAlignment} * 10, rounded to 1 decimal.

Return ONLY valid JSON:
{
  "recommendations": [{
    "rank": number,
    "feature_name": string,
    "description": string,
    "rationale": string,
    "user_impact": number (1-10),
    "revenue_impact": number (1-10),
    "effort": number (1-10),
    "strategic_alignment": number (1-10),
    "priority_score": number,
    "target_segment": string,
    "evidence": string[] (max 3 quotes),
    "competitive_context": string,
    "risk_if_delayed": string
  }],
  "summary": string (2-3 sentence strategy)
}`

  const themesSummary = themes.map((t) => ({ name: t.name, severity: t.severity, frequency: t.frequency, category: t.category }))
  const gapsSummary = gaps.map((g) => ({ area: g.area, our_status: g.our_status, opportunity: g.opportunity }))

  const userMessage = `Themes:\n${JSON.stringify(themesSummary, null, 1)}\n\nGaps:\n${JSON.stringify(gapsSummary, null, 1)}\n\nCompetitors: ${competitorData.map((c) => c.name).join(', ')}`
  return callLLM(systemPrompt, userMessage)
}
