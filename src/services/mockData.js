const firstNames = [
  'Jamie', 'Morgan', 'Casey', 'Jordan', 'Taylor', 'Alex', 'Riley', 'Avery',
  'Quinn', 'Skyler', 'Dakota', 'Reese', 'Finley', 'Rowan', 'Sage',
  'Cameron', 'Emerson', 'Harper', 'Hayden', 'Kendall', 'Logan', 'Parker',
  'Peyton', 'Reagan', 'Sawyer', 'Spencer', 'Blake', 'Drew', 'Ellis', 'Kit',
]

const lastNames = [
  'Torres', 'Chen', 'Nakamura', 'Okafor', 'Petrov', 'Rivera', 'Kim',
  'Johansson', 'Gupta', 'Williams', 'Bergström', 'Adeyemi', 'Santos',
  'Müller', 'Patel', 'Leclerc', 'Al-Farsi', 'O\'Brien', 'Tanaka', 'Novak',
  'Fernandez', 'Abadi', 'Kowalski', 'Singh', 'Jensen', 'Ito', 'Vasquez',
  'Andersen', 'Mwangi', 'Dubois',
]

const titles = [
  'PM', 'Senior PM', 'Head of Product', 'VP Product', 'Product Lead',
  'Director of Product', 'CPO', 'Product Ops Lead', 'Staff PM',
  'Group PM', 'Principal PM',
]

const companies = [
  'ScaleUp Inc', 'NovaTech', 'Brightpath', 'Helios AI', 'Meridian Labs',
  'Quantum SaaS', 'Orbis Systems', 'CloudNine', 'Axon Digital', 'Synthwave',
  'Clearbit Corp', 'Halo Ventures', 'Stratton Software', 'Zenith PM',
  'PlanForge', 'Focal Point', 'Mosaic Data', 'Riviera Tech', 'Vantage HQ',
  'AnchorPoint', 'Lumos PM', 'SpectrumOps', 'Beacon Analytics', 'Forge AI',
  'TidePool', 'NorthStar PM', 'Lattice Work', 'Prism SaaS', 'Evergreen PM',
  'Summit Labs',
]

const featureRequests = [
  'Need auto-generated PRDs from analysis — writing these manually takes hours every sprint',
  'Want Jira integration so tasks flow directly from Sprint It into our backlog',
  'AI prioritization based on data not gut feel — our PM team argues over priority every week',
  'Connect Slack threads to roadmap items automatically, so much context gets lost',
  'Auto-assign tasks to engineers based on expertise and capacity',
  'Export to Confluence so stakeholders can review in their usual tool',
  'Need experiment spec generation — we want to A/B test before building',
  'Would love a competitor diff view showing feature gaps side by side',
  'Integrate with Figma so design specs link directly to PRD items',
  'Weekly digest email summarizing pipeline activity for leadership',
  'Custom scoring model — we want to weight enterprise feedback higher',
  'Bulk import from Google Sheets — most of our survey data lives there',
  'API access so we can pipe Sprint It output into our data warehouse',
  'Multi-team support — we have 4 product squads that need separate views',
  'Roadmap timeline visualization generated from the analysis',
  'Stakeholder voting on generated recommendations before doc creation',
  'Integration with Linear for engineering task management',
  'Auto-tag feedback by product area using our custom taxonomy',
  'Localization support — our feedback comes in 5 languages',
  'Real-time collaboration on generated PRDs like Google Docs',
]

const bugs = [
  'CSV import fails on files larger than 5MB — just hangs with no error',
  'Analysis timed out after 3 minutes on a 200-entry dataset',
  'Lost my PRD on page refresh — no autosave?',
  'Theme clustering grouped "pricing complaints" with "feature requests about payments"',
  'Priority scores don\'t update when I change the weighting sliders',
  'Duplicate entries appear when importing the same CSV twice',
  'Export to PDF cuts off long recommendation descriptions',
  'Search in feedback list doesn\'t find partial matches',
  'Date filter shows wrong timezone — I\'m in EST but it shows UTC',
  'Assignment page crashes when team has more than 20 engineers',
  'Sentiment analysis flagged a clearly positive review as negative',
  'The "Run Analysis" button stays grayed out even after loading data',
  'Competitor cards don\'t refresh when adding a new domain',
  'Mobile view is completely broken — sidebar overlaps everything',
  'OKR generation sometimes returns objectives without key results',
]

const complaints = [
  'Still manually copying Zendesk tickets into Notion boards — this should be automated',
  'Prioritization in our team is basically whoever yells loudest in the meeting',
  'Can\'t share analysis results with my VP without exporting and reformatting',
  'Competitor analysis is always stale by the time we use it in planning',
  'No evidence trail for roadmap decisions — when leadership asks "why this?" I have nothing',
  'We spend 3 days every quarter just organizing feedback into themes manually',
  'Our PM process is: collect feedback in spreadsheets, argue in meetings, build what the CEO saw at a conference',
  'Interview transcripts just sit in Google Drive — nobody synthesizes them',
  'NPS responses pile up in SurveyMonkey and never get connected to product decisions',
  'Engineering complains our tickets lack context — but we don\'t have time to write detailed specs',
  'Cross-team dependencies are invisible until sprint planning when everything falls apart',
  'We have 400 pieces of feedback and zero systematic way to find patterns',
  'Support tickets have gold-mine insights but product team never sees them',
  'Our roadmap is a Google Sheet that gets outdated within a week of quarterly planning',
  'No way to quantify impact when presenting roadmap to the board',
]

const praises = [
  'Theme clustering saved 10 hours this sprint — what used to take a full day took 20 minutes',
  'Finally an evidence-based roadmap — my CEO actually said "this makes sense" for the first time',
  'Auto-PRD is 80% of what I\'d write manually, just needs light editing',
  'Engineering team loves tickets with full context — fewer "why are we building this?" questions',
  'The sentiment breakdown immediately showed us we were ignoring enterprise complaints',
  'Competitor analysis helped us find a gap nobody on the team had noticed',
  'Generated OKRs were surprisingly good — better than what we wrote in our last offsite',
  'Being able to trace a roadmap item back to 47 customer requests is incredibly powerful',
  'Sprint It cut our quarterly planning prep from 2 weeks to 2 days',
  'The one-pager format is exactly what our board expects — saved hours of formatting',
  'Imported 6 months of Intercom conversations and got actionable themes in minutes',
  'Our PM team went from reactive firefighting to proactive planning',
]

const sources = ['zendesk', 'intercom', 'survey', 'slack']
const sourceWeights = [0.30, 0.25, 0.25, 0.20]

const segments = ['enterprise', 'smb', 'free']
const segmentWeights = [0.40, 0.35, 0.25]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function weightedPick(items, weights) {
  const r = Math.random()
  let sum = 0
  for (let i = 0; i < items.length; i++) {
    sum += weights[i]
    if (r <= sum) return items[i]
  }
  return items[items.length - 1]
}

function randomDate(daysBack = 90) {
  const now = Date.now()
  const offset = Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000)
  return new Date(now - offset).toISOString().split('T')[0]
}

function generateName() {
  return `${pick(firstNames)} ${pick(lastNames)}, ${pick(titles)} at ${pick(companies)}`
}

function generateEntry(id, category, texts) {
  const sentimentMap = {
    feature_request: pick(['neutral', 'neutral', 'positive']),
    bug_report: pick(['negative', 'negative', 'neutral']),
    complaint: pick(['negative', 'negative', 'negative', 'neutral']),
    praise: 'positive',
  }

  return {
    id,
    customer_name: generateName(),
    feedback_text: pick(texts),
    sentiment: sentimentMap[category],
    source: weightedPick(sources, sourceWeights),
    customer_segment: weightedPick(segments, segmentWeights),
    date: randomDate(),
    category,
  }
}

export function generateMockFeedback(count = 150) {
  const entries = []
  for (let i = 0; i < count; i++) {
    const r = Math.random()
    let entry
    if (r < 0.30) {
      entry = generateEntry(i + 1, 'feature_request', featureRequests)
    } else if (r < 0.55) {
      entry = generateEntry(i + 1, 'bug_report', bugs)
    } else if (r < 0.80) {
      entry = generateEntry(i + 1, 'complaint', complaints)
    } else {
      entry = generateEntry(i + 1, 'praise', praises)
    }
    entries.push(entry)
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date))
}

export const mockCompetitors = {
  'productboard.com': {
    name: 'Productboard',
    domain: 'productboard.com',
    headcount: 800,
    headcount_yoy: 12,
    funding_total: '$290M',
    last_round: 'Series D',
    strength: 'Strong feedback collection portal and customer-facing roadmaps',
    weakness: 'Manual prioritization — no AI-driven analysis or auto-generated specs',
  },
  'aha.io': {
    name: 'Aha!',
    domain: 'aha.io',
    headcount: 250,
    headcount_yoy: 8,
    funding_total: 'Bootstrapped',
    last_round: 'N/A',
    strength: 'Comprehensive roadmap visualization and strategy-first workflow',
    weakness: 'Heavyweight setup, no AI layer, no automated insight extraction',
  },
  'dovetailapp.com': {
    name: 'Dovetail',
    domain: 'dovetailapp.com',
    headcount: 200,
    headcount_yoy: 15,
    funding_total: '$100M',
    last_round: 'Series A',
    strength: 'Excellent research synthesis with tagging and highlight reels',
    weakness: 'No roadmap connection — insights stay siloed from planning',
  },
  'notion.so': {
    name: 'Notion',
    domain: 'notion.so',
    headcount: 3000,
    headcount_yoy: 25,
    funding_total: '$2.75B',
    last_round: 'Series C',
    strength: 'Massive adoption, flexible workspace, strong collaboration',
    weakness: 'Generic tool — zero PM-specific intelligence or feedback analysis',
  },
}
