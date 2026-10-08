# Resume Engine

Tailor an application from a visitor’s own base resume and job description. The existing Next.js app provides a resume, cover letter, keyword gaps, an estimated ATS match, before/after edits, and outreach drafts with Markdown, DOCX, and print/PDF exports.

## Visitor flow and privacy

1. Paste a base resume (100–30,000 characters) or upload a text-based PDF (up to 5 MiB and 30 pages). Review extracted text before generating.
2. Paste a job description (50–30,000 characters), plus an optional company note (up to 1,000 characters).
3. Generate and review the documents in the main results area. Use **Edit inputs** to revise the source or **Regenerate application** to repeat it. Export anything to keep.

Inputs and generated history exist only in the current page’s memory. Reloading or closing the page clears them. There is no localStorage or sessionStorage persistence and no public database history. Uploaded PDFs are processed in memory on this app’s server, and are not saved. Image-only scans, encrypted PDFs, and corrupt PDFs require pasted text instead. Inputs are sent to Anthropic to generate the application; this does not make a claim about Anthropic’s retention policies. Responses use `Cache-Control: no-store`. Submitted resumes and provider error bodies are not logged by the application.

Legacy owner records remain untouched in the existing database. The unauthenticated `/api/history` read/write/delete routes and `/api/history/[id]` route return HTTP 410 and never import the database. Owner access to those records would require a separate authenticated flow. The previous static owner resume, personalized prompt, and a legacy design plan containing owner contact details are preserved locally in ignored `.private/` files, outside `public/`; the resume and prompt also have a pre-change backup in the Codex task workspace. Existing Git history remains unchanged. Do not commit or deploy these private materials.

## Local setup

Use Node.js 22.3 or newer in the Node 22 series for PDF extraction. The current Railway build uses Node 22.

```sh
npm install
cp .env.example .env.local
# Set ANTHROPIC_API_KEY securely in .env.local; never paste it into chat or source.
npm run dev
```

For the existing Railway service, retain its server-side `ANTHROPIC_API_KEY`. No database migration or new service is required. Preserve the live deployment until local changes are reviewed; the linked GitHub repository auto-deploys on push.

## Model

Both keyword extraction and document generation default to **Claude Sonnet 5.5**, API identifier `claude-sonnet-5-5`. `ANTHROPIC_MODEL` is an optional server-side override for a compatible model. Provider rejection is reported without silently switching models. The Sonnet 5.5 request uses `thinking: { type: "between_tools" }`, `output_config: { effort: "medium" }`, and no sampling parameters, following Anthropic’s [migration guide](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide).

A model appearing in an account’s selector does not confirm the deployed key’s current credits. No live generation or billing changes are needed for the automated tests. Cost depends on the input and output lengths and the account’s provider pricing.

## Factual safeguards

The generic system prompt treats the visitor’s supplied resume as the only source of candidate qualifications and preserves names, employers, actual titles, dates, contact details, education, certifications, and metrics. Job requirements absent from that resume remain gaps. Keyword matching runs against each submitted resume, not an embedded owner profile. Matches are lexical hints and require affirmative context before inclusion.

The server validates output shape and rejects candidate-name mismatches, original comparison bullets absent from the source, and new digit tokens in the generated resume. The writing rules also require past tense for roles with finite end dates and distinguish missing evidence from a stated lack of experience. Exact unmatched terms are review hints; differing wording may still describe a supported skill. These checks reduce factual errors but do not verify every semantic claim; review wording before exporting. ATS scores are heuristic estimates. Generated resume and cover-letter image syntax is rejected, and Markdown previews suppress images to prevent automatic requests to third-party image URLs.

PDF extraction uses an isolated worker with a 15-second deadline, a 128 MiB V8 heap limit, and an empty environment so it does not receive API credentials. It admits at most two concurrent requests and 60 requests per rolling hour. These limits reset on restart.

Public generation has a per-process limit of two concurrent requests and 30 admitted requests per rolling hour. This reduces abuse on the current single-instance service; it is not a billing cap and resets on restart. Multi-instance deployment would need a shared limiter and a separate budget policy. Failed admitted requests count toward the hourly limit.

## Verification

```sh
npm test
npm run build
```

Tests use Node’s test runner and VM modules to load the actual API routes with mocked Anthropic responses. They never call the live AI provider or connect to the owner database. Tests cover visitor-specific inputs and keywords, malformed/oversized requests, output validation, safe provider errors, legacy history denial, and the absent public owner resume.

Core files: `app/page.js` (visitor UI), `lib/generation.js` (validated stateless generation), `lib/system-prompt.js` (factual writing rules), `lib/keywords.js` (visitor-specific matching), `lib/generation-limits.js` (process limiter), `lib/pdf.js` and `/api/resume/extract` (bounded PDF extraction), and the API test files under `tests/`.
