import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { query } from '@/lib/db';
import { EXTRACTION_SYSTEM_PROMPT, crossReference } from '@/lib/keywords';

async function extractKeywords(jobDescription, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract all ATS keywords from this job description:\n\n${jobDescription}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error('Pass 1 extraction failed:', response.status);
    return { hard_skills: [], soft_skills: [], tools: [], phrases: [], variants: [] };
  }

  const data = await response.json();
  const rawText = data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  try {
    const cleaned = rawText.replace(/```json\s*|```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('Pass 1 JSON parse failed, continuing without keyword injection');
    return { hard_skills: [], soft_skills: [], tools: [], phrases: [], variants: [] };
  }
}

function buildKeywordChecklist(resumeMatch) {
  if (!resumeMatch || resumeMatch.length === 0) return '';
  const list = resumeMatch.map((term) => `- ${term}`).join('\n');
  return `\n\nMANDATORY KEYWORD CHECKLIST — every term below MUST appear verbatim (exact spelling and casing as written) at least once somewhere in the resume output:\n${list}`;
}

export const maxDuration = 120;

export async function POST(request) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription || jobDescription.trim().length < 50) {
      return Response.json(
        { error: 'Please provide a complete job description (at least 50 characters).' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'API key not configured. Set ANTHROPIC_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    // ── Pass 1: Extract all keywords from the JD ──────────────────────
    const extracted = await extractKeywords(jobDescription, apiKey);

    // ── Pass 1.5: Cross-reference against base resume ─────────────────
    const { resume_match, gaps } = crossReference(extracted);
    const keywordChecklist = buildKeywordChecklist(resume_match);

    // ── Pass 2: Generate resume with keyword constraints ──────────────
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Here is the Job Description I am applying to. Generate a targeted resume, cover letter, and ATS analysis. Return ONLY valid JSON as specified in your instructions.\n\n---\n\nJOB DESCRIPTION:\n\n${jobDescription}${keywordChecklist}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `API returned ${response.status}`;
      return Response.json({ error: errorMessage }, { status: response.status });
    }

    const data = await response.json();
    const rawText = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const cleaned = rawText.replace(/```json\s*|```\s*/g, '').trim();
    const result = JSON.parse(cleaned);

    // Attach gaps to the result (never stored in result JSON from Claude — we own this field)
    result.gaps = gaps;

    // Auto-save to database (non-blocking)
    query(
      `INSERT INTO generations (company_name, job_title, job_description, result)
       VALUES ($1, $2, $3, $4)`,
      [
        result.company_name || 'Unknown Company',
        result.job_title || null,
        jobDescription,
        JSON.stringify(result),
      ]
    ).catch((err) => console.error('DB save error:', err.message));

    return Response.json(result);
  } catch (error) {
    console.error('Generation error:', error);

    if (error instanceof SyntaxError) {
      return Response.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    return Response.json(
      { error: error.message || 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
