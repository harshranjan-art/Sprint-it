const ANTHROPIC_KEY = () => import.meta.env.VITE_ANTHROPIC_KEY

async function callClaudeMarkdown(systemPrompt, userMessage) {
  const key = ANTHROPIC_KEY()
  if (!key || key.startsWith('your_')) {
    throw new Error('Anthropic API key not configured. Add VITE_ANTHROPIC_KEY to your .env file.')
  }

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
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Claude API error (${res.status}): ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

function buildUserMessage(recommendation, themes, gaps) {
  return `Feature to document:
${JSON.stringify(recommendation, null, 2)}

Relevant themes from customer feedback analysis:
${JSON.stringify(themes, null, 2)}

Competitive gap analysis:
${JSON.stringify(gaps, null, 2)}`
}

// ─── PRD ────────────────────────────────────────────────────────────────────

const PRD_SYSTEM = `You are Sprint It, an AI product management agent writing a Product Requirements Document. Write a comprehensive, real-world PRD that a product team could actually execute on. Include:

1. OVERVIEW — Problem statement, background, who this is for
2. USER STORIES — 5-7 specific user stories in "As a [role], I want [X] so that [Y]" format
3. SUCCESS METRICS — 3-5 measurable KPIs with specific targets
4. REQUIREMENTS — Detailed functional requirements (must-have vs nice-to-have)
5. SCOPE — Explicitly in-scope and out-of-scope items
6. TECHNICAL CONSIDERATIONS — Architecture notes, dependencies, integration points
7. DESIGN NOTES — UX principles and key interaction patterns
8. TIMELINE — Phased rollout (MVP → V1 → V2) with week estimates
9. OPEN QUESTIONS — Unresolved decisions that need stakeholder input
10. RISKS & MITIGATIONS — What could go wrong and how to handle it

Use the evidence from customer feedback and competitive analysis.
Write in clear, professional prose — not a template with blanks.
Format as clean markdown with headers.`

// ─── OKRs ───────────────────────────────────────────────────────────────────

const OKR_SYSTEM = `You are Sprint It writing OKRs for this feature initiative. Create:
- 1 inspiring, qualitative Objective
- 3 measurable Key Results with specific numeric targets
- 2-3 Initiatives under each KR (concrete actions)
Base targets on the feedback volume and segment data provided.
Format as clean markdown.`

// ─── One-Pager ──────────────────────────────────────────────────────────────

const ONE_PAGER_SYSTEM = `You are Sprint It writing an executive one-pager. This goes to the CEO/VP. Keep it under 400 words. Include:
- THE ASK (1 sentence)
- WHY NOW (competitive urgency + customer pain)
- EXPECTED IMPACT (metrics and business value)
- RESOURCE ASK (team size, duration)
- KEY RISKS (and mitigations)
- TIMELINE (high-level milestones)
Write with conviction — you're recommending this, not presenting options.
Format as clean markdown.`

// ─── Experiment Spec ────────────────────────────────────────────────────────

const EXPERIMENT_SYSTEM = `You are Sprint It writing an A/B experiment specification. Include:
- HYPOTHESIS (if we do X, then Y will increase by Z%)
- CONTROL vs TREATMENT (what changes)
- PRIMARY METRIC + SECONDARY METRICS
- SAMPLE SIZE ESTIMATE (with assumptions)
- DURATION (with reasoning)
- SEGMENTS TO INCLUDE/EXCLUDE
- ROLLOUT PLAN (percentage ramp)
- KILL CRITERIA (when to stop the experiment)
- ANALYSIS PLAN (how we'll evaluate results)
Format as clean markdown.`

const SYSTEM_PROMPTS = {
  prd: PRD_SYSTEM,
  okrs: OKR_SYSTEM,
  onePager: ONE_PAGER_SYSTEM,
  experimentSpec: EXPERIMENT_SYSTEM,
}

export async function generateDocument(docType, recommendation, themes, gaps) {
  const systemPrompt = SYSTEM_PROMPTS[docType]
  if (!systemPrompt) {
    throw new Error(`Unknown document type: ${docType}`)
  }

  const userMessage = buildUserMessage(recommendation, themes, gaps)
  const content = await callClaudeMarkdown(systemPrompt, userMessage)

  return {
    content,
    timestamp: new Date().toISOString(),
    docType,
    featureName: recommendation.feature_name,
  }
}
