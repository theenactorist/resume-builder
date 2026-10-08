import { SYSTEM_PROMPT } from './system-prompt.js';
import { EXTRACTION_SYSTEM_PROMPT, crossReference } from './keywords.js';

// Verified against Anthropic's official Sonnet 5.5 model and migration docs.
export const DEFAULT_MODEL = 'claude-sonnet-5-5';
const MAX_BODY_BYTES = 256000;
const MAX_TEXT_LENGTH = 30000;

class GenerationError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readInput(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new GenerationError('Send the resume and job description as JSON.', 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new GenerationError('Please provide your resume and a job description.', 400);
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new GenerationError('The submitted text is too large.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let input;
  try { input = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new GenerationError('The submitted JSON is invalid.', 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new GenerationError('Please provide your resume and a job description.', 400);
  }
  const fields = [
    ['baseResume', 'base resume', 100, MAX_TEXT_LENGTH],
    ['jobDescription', 'job description', 50, MAX_TEXT_LENGTH],
    ['companyHook', 'company note', 0, 1000],
  ];
  const validated = {};
  for (const [key, label, min, max] of fields) {
    const value = key === 'companyHook' && input[key] === undefined ? '' : input[key];
    if (typeof value !== 'string' || value.trim().length < min) {
      throw new GenerationError(`Please provide a ${label}${min ? ` of at least ${min} characters` : ' as text'}.`, 400);
    }
    if (value.length > max) throw new GenerationError(`The ${label} must be ${max.toLocaleString('en-US')} characters or fewer.`, 413);
    validated[key] = value.trim();
  }
  return validated;
}

function textFromResponse(data) {
  if (data?.stop_reason === 'refusal') throw new GenerationError('Claude could not complete this request. Please review the supplied text.');
  if (['max_tokens', 'model_context_window_exceeded'].includes(data?.stop_reason)) {
    throw new GenerationError('The generated response was incomplete. Please shorten the supplied text and try again.');
  }
  if (!Array.isArray(data?.content)) throw new GenerationError('Claude returned an invalid response. Please try again.');
  const raw = data.content.filter(block => block?.type === 'text' && typeof block.text === 'string').map(block => block.text).join('');
  try { return JSON.parse(raw.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '').trim()); }
  catch { throw new GenerationError('Claude returned an invalid response. Please try again.'); }
}

const strings = value => Array.isArray(value) && value.every(item => typeof item === 'string');
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function validateResult(value, baseResume) {
  if (!object(value) || typeof value.resume !== 'string' || !value.resume.trim() ||
      typeof value.cover_letter !== 'string' || !object(value.analysis) || !object(value.ats_score) ||
      !Array.isArray(value.before_after) || !object(value.cold_messages)) {
    throw new GenerationError('Claude returned an incomplete result. Please try again.');
  }
  // Generated images can cause third-party requests in previews or Markdown exports.
  // Reject the document rather than silently changing a candidate's content.
  if ([value.resume, value.cover_letter].some(document => /!\s*\[|<\s*img\b/i.test(document))) {
    throw new GenerationError('The generated document contains an unsupported image. Please try again.');
  }
  for (const key of ['candidate_name', 'company_name', 'job_title', 'six_second_test']) {
    if (typeof value[key] !== 'string') throw new GenerationError('Claude returned an invalid result. Please try again.');
  }
  for (const key of ['hard_skills', 'soft_skills', 'keyword_map']) {
    if (!strings(value.analysis[key])) throw new GenerationError('Claude returned an invalid analysis. Please try again.');
  }
  for (const key of ['overall', 'keyword_coverage']) {
    if (!Number.isFinite(value.ats_score[key]) || value.ats_score[key] < 0 || value.ats_score[key] > 100) {
      throw new GenerationError('Claude returned an invalid score. Please try again.');
    }
  }
  if (!strings(value.ats_score.strongest_areas) || !strings(value.ats_score.gaps) ||
      value.before_after.some(item => !object(item) || ['before', 'after', 'why'].some(key => typeof item[key] !== 'string')) ||
      ['recruiter', 'designer'].some(key => typeof value.cold_messages[key] !== 'string') ||
      !object(value.cold_messages.subject_lines) ||
      ['recruiter', 'designer'].some(key => typeof value.cold_messages.subject_lines[key] !== 'string')) {
    throw new GenerationError('Claude returned an invalid result. Please try again.');
  }
  const normalize = text => text.toLowerCase().replace(/[‐‑–—]/g, '-').replace(/\s+/g, ' ').trim();
  const source = normalize(baseResume);
  if (value.candidate_name && !source.includes(normalize(value.candidate_name))) {
    throw new GenerationError('The generated candidate details do not match your base resume. Please try again.');
  }
  if (value.before_after.some(item => !item.before.trim() || !source.includes(normalize(item.before)))) {
    throw new GenerationError('The generated comparison does not match your original resume. Please try again.');
  }
  // Catch newly invented dates, quantities, or metrics before showing the resume.
  // This is an additional guard; semantic accuracy still requires human review.
  const numbers = text => text.match(/\d+(?:[.,]\d+)*/g) || [];
  const sourceNumbers = new Set(numbers(baseResume));
  if (numbers(value.resume).some(number => !sourceNumbers.has(number))) {
    throw new GenerationError('The generated resume added a number that is not in your base resume. Please try again.');
  }
  return value;
}

export function createGenerateHandler({ fetchImpl = fetch, apiKey = process.env.ANTHROPIC_API_KEY, model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL, acquire = () => ({ release() {} }) } = {}) {
  return async function POST(request) {
    try {
      const { baseResume, jobDescription, companyHook } = await readInput(request);
      if (!apiKey) return json({ error: 'Resume generation is not configured yet. Please contact the site owner.' }, 503);

      const permit = acquire();
      if (!permit) return json({ error: 'Generation is busy or the site usage limit was reached. Please try again later.' }, 429);
      try {
        const deadline = Date.now() + 110000;
        const callClaude = async (system, content, max_tokens) => {
          const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
            body: JSON.stringify({ model, max_tokens, thinking: { type: 'between_tools' }, output_config: { effort: 'medium' }, system, messages: [{ role: 'user', content }] }),
          });
          if (!response.ok) {
            if ([400, 404].includes(response.status)) throw new GenerationError('The configured Claude model is unavailable or the provider rejected the request. Please contact the site owner.', 503);
            if ([401, 403].includes(response.status)) throw new GenerationError('The Claude service credentials or model access need attention. Please contact the site owner.', 503);
            if (response.status === 429) throw new GenerationError('Claude is busy or its usage limit was reached. Please try again later.', 429);
            throw new GenerationError('Claude is temporarily unavailable. Please try again later.');
          }
          return textFromResponse(await response.json());
        };

        let extracted = {};
        try {
          extracted = await callClaude(EXTRACTION_SYSTEM_PROMPT, JSON.stringify({ jobDescription }), 1600);
        } catch (error) {
          // An invalid extraction can fall back to no keyword hints; credentials/model errors cannot.
          if (error.status === 503 || error.status === 429 || error.name === 'TimeoutError' || error.name === 'AbortError') throw error;
        }
        const { resume_match, gaps } = crossReference(extracted, baseResume);
        const content = JSON.stringify({
          BASE_RESUME: baseResume,
          JOB_DESCRIPTION: jobDescription,
          COMPANY_HOOK: companyHook,
          SUPPORTED_KEYWORD_HINTS: resume_match,
          UNSUPPORTED_REQUIREMENTS: gaps,
        });
        const result = validateResult(await callClaude(SYSTEM_PROMPT, content, 8000), baseResume);
        // The server owns the gap field, rather than trusting the model to override it.
        result.gaps = gaps;
        // Public visitor generations are stateless. Never read/write the legacy owner's database.
        return json(result);
      } finally { permit.release(); }
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return json({ error: 'Generation timed out. Please try again.' }, 504);
      }
      // Never return upstream error bodies, credentials, submitted resume text, or DB errors.
      return json({ error: error instanceof GenerationError ? error.message : 'Generation failed. Please try again.' }, error instanceof GenerationError ? error.status : 502);
    }
  };
}
