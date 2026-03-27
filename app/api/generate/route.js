import { SYSTEM_PROMPT } from '@/lib/system-prompt';

export const maxDuration = 60;

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
            content: `Here is the Job Description I am applying to. Generate a targeted resume, cover letter, and ATS analysis. Return ONLY valid JSON as specified in your instructions.\n\n---\n\nJOB DESCRIPTION:\n\n${jobDescription}`,
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

    // Parse the JSON response from Claude
    const cleaned = rawText.replace(/```json\s*|```\s*/g, '').trim();
    const result = JSON.parse(cleaned);

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
