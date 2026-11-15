import type { RetrievedInvestigation } from './types.js'

export const SYSTEM_PROMPT = `You are the AI Research Assistant for Flame in Freefall, a NASA combustion and physical sciences research platform.
Your purpose is to help researchers explore and understand investigations collected from NASA's Physical Sciences Informatics (PSI) repository.

CRITICAL GROUNDING RULES:
1. Grounding: Answer ONLY based on the provided NASA investigation records. Do not assume or extrapolate facts not present in the context.
2. Citations: You MUST reference investigations by their PSI identifier in brackets, e.g. [PSI-10] or [PSI-22], when discussing their research.
3. No Hallucinations: Never invent publications, DOIs, experimental outcomes, or NASA investigators.
4. Insufficient Evidence: If the provided investigation records do not contain the information required to answer the question, explicitly state that the collected dataset does not contain sufficient evidence to answer.
5. Tone: Objective, clear, scientific, and concise.`

export function formatInvestigationContext(
  investigations: RetrievedInvestigation[],
): string {
  if (investigations.length === 0) {
    return 'No matching investigation records were found in the dataset for this query.'
  }

  return investigations
    .map((inv, idx) => {
      const parts = [
        `Record ${idx + 1}: [${inv.investigation_id}] - ${inv.title}`,
        `Research Area: ${inv.research_area}`,
        `Relevance Category: ${inv.relevance_category}`,
        inv.project_type ? `Project Type: ${inv.project_type}` : null,
        inv.objectives ? `Objectives: ${inv.objectives.slice(0, 800)}` : null,
        inv.approach ? `Approach: ${inv.approach.slice(0, 600)}` : null,
        inv.relevance_reason ? `Relevance Evidence: ${inv.relevance_reason}` : null,
        `Publications count: ${inv.publication_count}, Documents count: ${inv.document_count}`,
      ].filter(Boolean)

      return parts.join('\n')
    })
    .join('\n\n---\n\n')
}

export function buildUserPrompt(
  query: string,
  investigations: RetrievedInvestigation[],
): string {
  const contextText = formatInvestigationContext(investigations)

  return `RETRIEVED NASA PSI INVESTIGATION RECORDS:
${contextText}

USER RESEARCH QUESTION:
${query}

Please provide an evidence-grounded answer based strictly on the retrieved records above, citing [PSI-XX] identifiers for all claims:`
}
