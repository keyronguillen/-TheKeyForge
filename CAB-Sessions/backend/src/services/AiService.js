/**
 * AI assistant powered by Claude (Anthropic SDK).
 *
 * Three capabilities for the CAB:
 *   1. draftReview()      — pre-fill the Tab 2 fields from the ticket's SNOW/ADO text
 *   2. generateFeedback() — risks, missing info, questions, and a recommendation
 *   3. generateCabReport()— a post-CAB executive summary across tickets
 *
 * Security/GDPR: the API key lives only here (backend). Ticket text is sent to
 * Anthropic for processing — for the POC keep real PII out of tickets, and note
 * the data-processing dependency in any compliance review. If no key is set the
 * service self-disables (the rest of the app is unaffected).
 */
import Anthropic from '@anthropic-ai/sdk';
import { config, isAiEnabled } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

const MODEL = config.ai.model;

export class AiService {
  constructor() {
    // Only construct the client when a key exists, so import never throws.
    this.client = isAiEnabled ? new Anthropic({ apiKey: config.ai.apiKey }) : null;
  }

  get enabled() {
    return isAiEnabled;
  }

  #ensureEnabled() {
    if (!this.client) {
      throw new AppError(503, 'AI features are not configured. Set ANTHROPIC_API_KEY on the server.');
    }
  }

  /** Compact, human-readable summary of a ticket for prompting. */
  #ticketContext(t) {
    return [
      `Requestor: ${t.requestor}`,
      `Assignee: ${t.assignee ?? '—'}`,
      `Requested date: ${t.requested_date ?? '—'}`,
      `UAT proposed: ${t.uat_proposed_date ?? '—'}`,
      `Prod proposed: ${t.prod_proposed_date ?? '—'}`,
      `ServiceNow CR ${t.snow_ticket_number ?? '—'}: ${t.snow_description ?? '(no description)'}`,
      `Azure DevOps Feature ${t.ado_ticket_number ?? '—'}: ${t.ado_description ?? '(no description)'}`,
    ].join('\n');
  }

  /**
   * 1) Draft the four Tab-2 review fields. Returns a structured object.
   */
  async draftReview(ticket) {
    this.#ensureEnabled();
    const system = 'You are a senior Change Advisory Board (CAB) analyst. From the change'
      + ' request details, produce a concise, factual draft for the review fields. Base it'
      + ' only on the information given; where unknown, state a sensible assumption to verify.';

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [{
        role: 'user',
        content: `Change details:\n\n${this.#ticketContext(ticket)}\n\n`
          + 'Draft the CAB review fields.',
      }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              tools_touched: { type: 'string', description: 'Tools or features touched by the change' },
              compliance_process: { type: 'string', description: 'Relevant compliance/change-control process' },
              what_it_fixes: { type: 'string', description: 'What the update fixes or improves' },
              what_deprecated: { type: 'string', description: 'What is deprecated or removed' },
            },
            required: ['tools_touched', 'compliance_process', 'what_it_fixes', 'what_deprecated'],
            additionalProperties: false,
          },
        },
      },
    });

    return { fields: JSON.parse(this.#firstText(response)), model: MODEL };
  }

  /**
   * 2) Generate reviewer feedback (markdown): risks, missing info, questions,
   *    and a recommendation. Uses the review fields if already present.
   */
  async generateFeedback(detail) {
    this.#ensureEnabled();
    const review = detail.review ?? {};
    const reviewText = [
      `Tools/features touched: ${review.tools_touched ?? '—'}`,
      `Compliance process: ${review.compliance_process ?? '—'}`,
      `What it fixes: ${review.what_it_fixes ?? '—'}`,
      `What is deprecated: ${review.what_deprecated ?? '—'}`,
    ].join('\n');

    const system = 'You are a senior CAB reviewer. Give crisp, actionable feedback to help'
      + ' the board run the change review. Use short markdown sections: **Risks**,'
      + ' **Missing information**, **Questions to ask**, **Recommendation**'
      + ' (one of: Approve / Reject / Needs review, with a one-line reason). Be specific and brief.';

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [{
        role: 'user',
        content: `CHANGE:\n${this.#ticketContext(detail)}\n\nREVIEW NOTES:\n${reviewText}`,
      }],
    });

    return { feedback: this.#firstText(response), model: MODEL };
  }

  /**
   * 3) Generate a post-CAB report (markdown) across the provided tickets.
   */
  async generateCabReport(tickets) {
    this.#ensureEnabled();
    const lines = tickets.map((t) => {
      const decision = t.decision && t.decision !== 'pending' ? t.decision : t.status;
      return `- [${decision}] ${t.snow_ticket_number ?? `#${t.id}`} / ${t.ado_ticket_number ?? '—'}`
        + ` — ${t.requestor}: ${t.snow_description ?? t.ado_description ?? '(no description)'}`;
    }).join('\n');

    const system = 'You are a CAB secretary. Write a concise post-CAB summary report in markdown'
      + ' with sections: **Overview** (counts of approved/rejected/pending), **Decisions**'
      + ' (bulleted), **Follow-ups / action items**, and **Risks to watch**. Keep it tight and'
      + ' suitable to email to leadership.';

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system,
      messages: [{ role: 'user', content: `CAB tickets in this session:\n${lines}` }],
    });

    return { report: this.#firstText(response), model: MODEL };
  }

  /** Extract the first text block from a Messages API response. */
  #firstText(response) {
    const block = response.content.find((b) => b.type === 'text');
    return block ? block.text : '';
  }
}
