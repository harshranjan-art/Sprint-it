import { mockCompetitors } from './mockData'

const CRUSTDATA_KEY = import.meta.env.VITE_CRUSTDATA_KEY
const BASE_URL = 'https://api.crustdata.com'

function isConfigured() {
  return !!CRUSTDATA_KEY && !CRUSTDATA_KEY.startsWith('your_')
}

/**
 * Enrich a company domain via Crustdata API.
 * Falls back to mock data if API is unavailable.
 */
export async function enrichCompany(domain) {
  if (isConfigured()) {
    try {
      const res = await fetch(`${BASE_URL}/enrich/company/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${CRUSTDATA_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domains: [domain],
          fields: ['headcount', 'yoy_growth', 'funding'],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data && (Array.isArray(data) ? data.length > 0 : true)) {
          const company = Array.isArray(data) ? data[0] : data
          return {
            name: company.name || company.company_name || domain.split('.')[0],
            domain,
            headcount: company.headcount || company.employee_count || null,
            headcount_yoy: company.yoy_growth || company.headcount_yoy || null,
            funding_total: company.funding_total || company.total_funding || null,
            last_round: company.last_round || company.latest_round || null,
            strength: company.strength || 'Data retrieved from Crustdata',
            weakness: company.weakness || 'Analysis pending',
          }
        }
      }
    } catch (err) {
      console.warn(`[Crustdata] API call failed for ${domain}: ${err.message}`)
    }
  }

  // Fall back to mock data
  const normalized = domain.toLowerCase().trim()
  if (mockCompetitors[normalized]) {
    return { ...mockCompetitors[normalized] }
  }

  // Generic fallback for unknown domains
  return {
    name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
    domain,
    headcount: null,
    headcount_yoy: null,
    funding_total: 'Unknown',
    last_round: 'Unknown',
    strength: 'Data not available — add to Crustdata for enrichment',
    weakness: 'Insufficient data for competitive analysis',
  }
}
