import { generateMockFeedback, mockCompetitors } from './mockData'
import { enrichCompany } from './crustdataService'
import { discoverThemes, analyzeGaps, generateRecommendations } from './analysisService'
import { generateDocument } from './docService'
import { autoAssign } from './assignmentService'
import { engineers } from '../data/mockTeam'

const DEFAULT_WEIGHTS = { userImpact: 25, revenueImpact: 25, effort: 25, strategicAlignment: 25 }

/**
 * Run the full Sprint It pipeline end-to-end.
 * Calls onStep(stepIndex, stepLabel) to update progress UI.
 * Returns the accumulated results so the caller can update global state.
 */
export async function runFullPipeline(onStep, addEvent, updateState, updatePipelineStatus) {
  const results = {}

  // ── Step 1: Load Data ──
  onStep(0, 'Loading data...')

  const feedbackData = generateMockFeedback(150)
  updateState({ feedbackData })
  updatePipelineStatus('ingest', 'complete')
  await addEvent('data_ingested', { feedbackCount: feedbackData.length }, `Loaded ${feedbackData.length} sample feedback entries`)

  // Load competitors
  const competitorDomains = Object.keys(mockCompetitors)
  const competitorData = []
  for (const domain of competitorDomains) {
    const company = await enrichCompany(domain)
    competitorData.push(company)
  }
  updateState({ competitorData })
  results.feedbackData = feedbackData
  results.competitorData = competitorData

  // ── Step 2: Discover Themes ──
  onStep(1, 'Analyzing themes...')
  updatePipelineStatus('analysis', 'active')
  await addEvent('analysis_started', {
    entryCount: feedbackData.length,
    competitorCount: competitorData.length,
  }, `Analysis started: ${feedbackData.length} entries, ${competitorData.length} competitors`)

  const themeResult = await discoverThemes(feedbackData)
  const themes = themeResult.themes || []
  const criticalCount = themes.filter((t) => t.severity === 'critical').length
  await addEvent('themes_found', { themeCount: themes.length, criticalCount }, `Discovered ${themes.length} themes (${criticalCount} critical)`)

  // ── Step 3: Gap Analysis ──
  onStep(2, 'Finding gaps...')

  const gapResult = await analyzeGaps(themes, competitorData)

  // ── Step 4: Recommendations ──
  onStep(3, 'Generating recommendations...')

  const recResult = await generateRecommendations(themes, gapResult.gaps || [], competitorData, DEFAULT_WEIGHTS)
  const recommendations = recResult.recommendations || []

  const analysisResults = {
    themes,
    gaps: gapResult.gaps || [],
    marketPosition: gapResult.market_position,
    biggestThreat: gapResult.biggest_threat,
    biggestOpportunity: gapResult.biggest_opportunity,
    recommendations,
    summary: recResult.summary,
  }

  updateState({ analysisResults })
  updatePipelineStatus('analysis', 'complete')

  const topFeature = recommendations[0]?.feature_name || 'N/A'
  await addEvent('recommendations_made', { topFeature, count: recommendations.length }, `Generated ${recommendations.length} recommendations. Top: ${topFeature}`)

  results.analysisResults = analysisResults

  // ── Step 5: Generate PRD ──
  onStep(4, 'Writing PRD...')
  updatePipelineStatus('docs', 'active')

  if (recommendations[0]) {
    const doc = await generateDocument('prd', recommendations[0], themes, gapResult.gaps || [])
    const featureId = recommendations[0].feature_name
    const generatedDocs = { [featureId]: { prd: doc } }
    updateState({ generatedDocs })
    updatePipelineStatus('docs', 'complete')
    await addEvent('doc_generated', { feature: featureId, type: 'prd' }, `Generated PRD for "${featureId}"`)
    results.generatedDocs = generatedDocs
  }

  // ── Step 6: Assign Engineer ──
  onStep(5, 'Assigning engineers...')
  updatePipelineStatus('assign', 'active')

  if (recommendations[0]) {
    const assignment = await autoAssign(
      recommendations[0],
      engineers,
      { themes, gaps: gapResult.gaps || [] }
    )

    const teamAssignment = {
      feature: recommendations[0].feature_name,
      assignee: assignment.primary_assignee?.name,
      support: assignment.supporting_engineer?.name,
      points: assignment.estimated_points,
      sprints: assignment.estimated_sprints,
    }
    updateState({ teamAssignments: [teamAssignment] })
    updatePipelineStatus('assign', 'complete')
    await addEvent('task_assigned', {
      feature: recommendations[0].feature_name,
      assignee: assignment.primary_assignee?.name,
      points: assignment.estimated_points,
    }, `Assigned "${recommendations[0].feature_name}" to ${assignment.primary_assignee?.name}`)
    results.assignment = assignment
  }

  return results
}
