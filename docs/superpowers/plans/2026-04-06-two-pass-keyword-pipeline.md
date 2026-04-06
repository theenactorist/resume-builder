# Two-Pass Keyword Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single Claude generation call with a two-pass pipeline that (1) extracts all ATS keywords from any job description and (2) injects matched keywords as hard constraints into resume generation — while surfacing unmatched terms to the user as a skill gap notification.

**Architecture:** Pass 1 runs a cheap, fast extraction call against the raw JD text, returning structured JSON of all keywords. A cross-reference function then splits them into `resume_match` (terms found in the base resume → injected as hard constraints into Pass 2) and `gaps` (terms not in base resume → returned to UI as a notification panel). Pass 2 is the existing generation call, augmented with the keyword checklist.

**Tech Stack:** Next.js 14 API routes, Anthropic Messages API, Tailwind CSS, React

---

## File Map

| File | Role |
|---|---|
| `lib/system-prompt.js` | Export `BASE_RESUME` as a separate constant; update Phase 1 instructions to remove top-N cap and reference injected keyword checklist |
| `lib/keywords.js` | New file. Owns `EXTRACTION_SYSTEM_PROMPT` constant and `crossReference(extracted)` function |
| `app/api/generate/route.js` | Orchestrates the two-pass pipeline; calls Pass 1, runs cross-reference, injects keywords into Pass 2 user message, adds `gaps` to response |
| `app/page.js` | Adds `GapsPanel` component; renders it when `result.gaps` contains any items |

---

## Task 1: Export BASE_RESUME from system-prompt.js

**Files:**
- Modify: `lib/system-prompt.js`

The base resume text is currently embedded inline in `SYSTEM_PROMPT`. We need it as a separate exported constant so `lib/keywords.js` can run string-match cross-references against it without importing the full 10KB prompt string.

- [ ] **Step 1: Read the current system-prompt.js to find the exact base resume boundaries**

The base resume runs from the line starting with `Olumide Olusesi` (after `BASE RESUME (source of truth...):`) through the line ending in `design rework.` — just before the `===` separator. It is currently lines 43–82 of the SYSTEM_PROMPT string.

- [ ] **Step 2: Extract BASE_RESUME as a separate constant**

At the top of `lib/system-prompt.js`, before the `SYSTEM_PROMPT` definition, add:

```js
export const BASE_RESUME = `Olumide Olusesi
(236) 239-0910 | [consistentolusesi@gmail.com](mailto:consistentolusesi@gmail.com) | [linkedin.com/in/olumideolusesi](https://linkedin.com/in/olumideolusesi) | [olumideolusesi.com](https://olumideolusesi.com)
Greater Toronto Area, Ontario, Canada

PROFILE SUMMARY
Senior Product Designer with 7+ years leading end-to-end UX, UI, and content design for fintech products across KYC, lending, payments, and enterprise platforms. Canadian permanent resident with expertise in multi-market product design (Nigeria, Kenya, India), scalable design systems, and AI-augmented design operations. Proven cross-functional leader who has served as de facto product owner, shipping revenue-generating products from zero to market.

EXPERIENCE

Senior Product Designer (Consultant), Shiga Onchain Banking — May 2024 – Present
- Translated founders' vision into a viable, investor-ready product across three platforms (ENTA consumer wallet, FORGE corporate banking, Telegram Mini-app), designing pitch decks, product strategy, and end-to-end experiences that contributed directly to securing $1.2M in funding from Tether and acceptance into the Visa Accelerator program.
- Architected Shiga's design system (Helium 2.0) from the ground up, establishing a scalable token library spanning 263 color variables, typography, spacing, and radius tokens across light and dark modes, and shipping production-ready theme files for Android, iOS, and web that unified the product's visual identity from a raw concept into a recognizable, cohesive brand.
- Simplified complex cryptocurrency payment flows (Swap, Onramp, Offramp, Currency Conversion) by reworking information architecture, restructuring navigation patterns, and rewriting 100+ error messages across 12 categories with clear recovery paths, reducing payment-related errors by an estimated 40% based on support ticket trends.
- Identified new revenue opportunities through customer engagement and competitive research, then designed and prototyped Payment Links with dual crypto/fiat settlement, a Telegram-based Virtual POS for street vendors, a shareable Rate Calculator, and a cryptocurrency invoice page, expanding Shiga's product surface beyond its core wallet offering.
- Collaborated with marketing and growth to design and build segmented email automation workflows in MailerLite covering onboarding (Nigeria, Global, Business), post-KYC activation, and win-back sequences, achieving a 73% open rate on the reactivation campaign and establishing Shiga's first structured lifecycle marketing engine.
- Spearheading a KYC flow redesign targeting higher completion rates by reducing verification friction and improving requirement communication, alongside implementing multi-factor Transaction Authentication (PIN, Passkey, Authenticator, Email OTP) for the platform's Security settings.

Senior Product Designer, Branch International Financial Services — Oct 2024 – March 2026
- Led the migration of wallet, rewards, home screen, loan, and KYC modules across Kenya, India, and Nigeria from a legacy system to Branch's Neem Design System, achieving 100% visual and functional consistency across 5 product modules and modernizing the mobile experience for millions of users.
- Redesigned a core KYC onboarding flow with an OTP-based pre-fill system, increasing approval rates from 42% to 56%, eliminating manual data entry errors by 35%, and directly increasing downstream loan applications and disbursements.
- Built a suite of AI-powered design tools — a Claude-based prototyping skill, a UX copywriting system (CopyGPT), and an illustration generator — adopted 500+ times across 6 teams in 4 countries (Nigeria, Kenya, India, US), reducing copywriting turnaround and eliminating dependency on external illustration sourcing.
- Created and led adoption of a unified Figma information architecture, reducing designer and manager search time by 30% and improving version control across 200+ prototypes and hi-fi screens.
- Adapted the web design system from mobile using tokens and Code Connect, reducing design-to-delivery time by 20% and increasing UI consistency across 6 products.
- Designed customer-facing security features (masked balances, transaction history) and multi-variant onboarding experiments, balancing compliance with user experience to improve loan application rates.
- Extended design impact beyond product teams: designed an employee recognition badge system from scratch, created all visual assets for a hiring fair (social media campaigns, branded merch), and supported People Ops and Marketing on campaigns that unblocked stalled hiring pipelines.
- Led design operations through weekly design reviews, QA sessions with engineers, product roadmap planning, and cross-functional collaboration across 3 teams: Core Design, Product, and Marketing/People Ops.

Product Designer, Carbon Finance — Jun 2022 – Oct 2024
- Owned product strategy and design for Carbon Business — the company's first B2B lending product for SME working capital (₦200k–₦10M). Led a cross-functional team of 5, writing PRDs, running sprints, and managing stakeholders end-to-end — eliminating the need for contract PM. Designed the full KYB flow (document uploads, credit assessment) with under-48-hour disbursement, shipping from zero to $500k CAD disbursed in 9 months.
- Led end-to-end design for onboarding, lending, payments, and cards products from discovery through delivery, improving feature adoption by 20%.
- Harmonized Android and iOS home screen experiences to address security pain points and design discrepancies, resulting in heightened customer trust, a 15% boost in organic referrals, and increased user acquisition.
- Founded and grew a Beta-Testing Community to 120+ participants, capturing qualitative and quantitative insights that reduced external research costs by 25% and deepened the product team's direct line to users.
- Conducted user interviews, usability tests, and competitive analysis, partnering with the data team to translate behavioral analytics into actionable design insights.
- Standardized design handoff through guidelines and component libraries, improving design-to-development velocity by 30% and reducing review cycles.

Product Designer, United Bank for Africa (UBA) Group — Nov 2019 – Jun 2022
- Designed user experiences for financial mobile apps, ATMs, and kiosk interfaces through wireframing, prototyping, and multi-round usability testing across form factors, improving user satisfaction by 15%.
- Led end-to-end design for an enterprise HR automation web app serving 10,000+ employees, replacing Salesforce-based workflows with a purpose-built platform — improving HR efficiency by 30% and saving the organization ~$960k annually in license fees.
- Created foundational design-system guides including component documentation, usage patterns, and design tokens, adopted across multiple teams through workshops and design reviews — boosting product consistency by 25% and reducing design rework.

EDUCATION
B.Sc. in Civil Engineering, Obafemi Awolowo University — 2017

CERTIFICATIONS & MENTORSHIP
Information Technology Professional (ITP) Canada, ICTC-CTIC — 2025
AI in UX/UI Design, Uxcel — 2023
Design Mentor, ADPList (2023 – Present) — 1,200+ minutes of mentorship across 41+ sessions`;
```

- [ ] **Step 3: Replace the inline base resume in SYSTEM_PROMPT with a reference to BASE_RESUME**

Find this line in SYSTEM_PROMPT (currently the long inline base resume block after `BASE RESUME (source of truth — never invent experiences):`):

```js
BASE RESUME (source of truth — never invent experiences):

Olumide Olusesi
(236) 239-0910 ...
...
design rework.
```

Replace it with:

```js
BASE RESUME (source of truth — never invent experiences):

${BASE_RESUME}
```

This keeps the prompt DRY. `SYSTEM_PROMPT` must be defined AFTER `BASE_RESUME` since it references it via template literal.

- [ ] **Step 4: Update Phase 1 Step 4 in SYSTEM_PROMPT to remove the top-N cap**

Find in SYSTEM_PROMPT:
```
4. SKILLS EXTRACTION: Extract top 7 hard skills and top 5 soft skills, ordered by JD emphasis (not alphabetically). For every technical term, include both acronym AND full version once (e.g., "Know Your Customer (KYC)").
```

Replace with:
```
4. SKILLS EXTRACTION: The keyword extraction and gap analysis has already been performed — a MANDATORY KEYWORD CHECKLIST will be appended to the user message. Your job is to ensure every term in that checklist appears verbatim in the resume. Additionally, for every technical term, include both acronym AND full version once (e.g., "Know Your Customer (KYC)").
```

- [ ] **Step 5: Update the JSON schema description for hard_skills and soft_skills in SYSTEM_PROMPT**

Find:
```
"hard_skills": ["top 7 hard skills from JD, ordered by frequency/emphasis"],
"soft_skills": ["top 5 soft skills from JD, ordered by frequency/emphasis"],
```

Replace with:
```
"hard_skills": ["all hard skills extracted from JD, ordered by frequency/emphasis"],
"soft_skills": ["all soft skills extracted from JD, ordered by frequency/emphasis"],
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/olumide/Documents/Vibe coding/Resume-Builder/resume-engine"
git add lib/system-prompt.js
git commit -m "refactor: export BASE_RESUME separately, remove top-N keyword cap from Phase 1"
```

---

## Task 2: Create lib/keywords.js

**Files:**
- Create: `lib/keywords.js`

This file owns two things: the extraction system prompt and the cross-reference logic. Nothing else.

- [ ] **Step 1: Create lib/keywords.js with EXTRACTION_SYSTEM_PROMPT**

```js
import { BASE_RESUME } from './system-prompt.js';

export const EXTRACTION_SYSTEM_PROMPT = `You are an ATS keyword extraction specialist. Your only job is to extract every keyword, skill, tool, and phrase from a job description that an ATS system would scan for.

Return ONLY a valid JSON object. No markdown fences, no preamble, no explanation. Raw JSON only.

{
  "hard_skills": [],
  "soft_skills": [],
  "tools": [],
  "phrases": [],
  "variants": []
}

Field definitions:
- hard_skills: Technical skills, methodologies, domain knowledge areas (e.g. "data visualization", "rapid prototyping", "feasibility", "New Product Development")
- soft_skills: Personality traits and interpersonal descriptors — especially from "About You" or "All About You" sections (e.g. "empathetic", "creative", "collaborative", "passionate")
- tools: Every named software tool, platform, or technology mentioned ANYWHERE in the document — required sections AND nice-to-have sections (e.g. "Figma", "Adobe Illustrator", "Sketch", "Adobe Experience Design")
- phrases: Exact multi-word compound terms used as a unit — team names, product types, methodology names, role descriptors (e.g. "New Product Development", "cross-functional team", "design and development", "digital products", "product solutions", "Lean UX", "Design Thinking")
- variants: Array of pairs. When a term appears both hyphenated and unhyphenated in the JD, capture both forms as a pair: [["data-driven", "data driven"], ["B2B2C", "B2B2C"]]

Rules:
- Scan the ENTIRE document — including role description, requirements, nice-to-have, boilerplate, legal, and security footer sections
- Do NOT filter by importance — extract everything, including low-frequency terms
- Do NOT rephrase or summarize — use the exact words from the JD
- For soft_skills: include adjectives and personality descriptors even if they appear only once
- For tools: if a tool appears in a parenthetical list (e.g. "Figma, Sketch, Adobe Illustrator") include all of them
- Deduplicate within each array — no term should appear twice in the same array`;
```

- [ ] **Step 2: Add the crossReference function**

Append to `lib/keywords.js`:

```js
/**
 * Splits extracted keywords into two buckets:
 * - resume_match: terms found in the base resume → safe to inject as constraints
 * - gaps: terms NOT in the base resume → surface to user, never fabricate
 *
 * @param {Object} extracted - The parsed JSON from Pass 1
 * @param {string[]} extracted.hard_skills
 * @param {string[]} extracted.soft_skills
 * @param {string[]} extracted.tools
 * @param {string[]} extracted.phrases
 * @param {string[][]} extracted.variants
 * @returns {{ resume_match: string[], gaps: { tools: string[], skills: string[], soft_skills: string[] } }}
 */
export function crossReference(extracted) {
  const resumeLower = BASE_RESUME.toLowerCase();
  const inResume = (term) => resumeLower.includes(term.toLowerCase());

  const resume_match = new Set();
  const gaps = { tools: [], skills: [], soft_skills: [] };

  // Hard skills and phrases → gaps.skills if missing
  for (const term of [...(extracted.hard_skills || []), ...(extracted.phrases || [])]) {
    if (inResume(term)) {
      resume_match.add(term);
    } else {
      gaps.skills.push(term);
    }
  }

  // Tools → gaps.tools if missing
  for (const term of (extracted.tools || [])) {
    if (inResume(term)) {
      resume_match.add(term);
    } else {
      gaps.tools.push(term);
    }
  }

  // Soft skills → gaps.soft_skills if missing
  for (const term of (extracted.soft_skills || [])) {
    if (inResume(term)) {
      resume_match.add(term);
    } else {
      gaps.soft_skills.push(term);
    }
  }

  // Variants: if EITHER form is in the resume, inject BOTH forms
  // (ATS tools match both hyphenated and unhyphenated as separate tokens)
  // If NEITHER form is in resume, add to gaps.skills
  for (const pair of (extracted.variants || [])) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const [form1, form2] = pair;
    const eitherInResume = inResume(form1) || inResume(form2);
    if (eitherInResume) {
      resume_match.add(form1);
      resume_match.add(form2);
    } else {
      // Only add if not already in gaps.skills to avoid duplicates
      if (!gaps.skills.includes(form1)) gaps.skills.push(form1);
    }
  }

  return {
    resume_match: [...resume_match],
    gaps,
  };
}
```

- [ ] **Step 3: Verify the logic manually before moving on**

Open a Node REPL and test the cross-reference with a mock extracted object:

```bash
cd "/Users/olumide/Documents/Vibe coding/Resume-Builder/resume-engine"
node --input-type=module << 'EOF'
import { crossReference } from './lib/keywords.js';
const mock = {
  hard_skills: ['rapid prototyping', 'feasibility', 'data modeling'],
  soft_skills: ['empathetic', 'cross-functional'],
  tools: ['Figma', 'Adobe Illustrator'],
  phrases: ['New Product Development', 'cross-functional team'],
  variants: [['data-driven', 'data driven']]
};
const result = crossReference(mock);
console.log('resume_match:', result.resume_match);
console.log('gaps:', result.gaps);
EOF
```

Expected output:
- `resume_match` should contain: `rapid prototyping`, `Figma`, `cross-functional`, `data-driven`, `data driven` (and any others actually present in BASE_RESUME)
- `gaps.skills` should contain: `feasibility`, `data modeling`, `New Product Development`, `cross-functional team`
- `gaps.tools` should contain: `Adobe Illustrator`
- `gaps.soft_skills` should contain: `empathetic`

- [ ] **Step 4: Commit**

```bash
git add lib/keywords.js
git commit -m "feat: add keyword extraction prompt and cross-reference logic"
```

---

## Task 3: Update route.js to two-pass pipeline

**Files:**
- Modify: `app/api/generate/route.js`

- [ ] **Step 1: Add imports at the top of route.js**

Replace the current imports:
```js
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { query } from '@/lib/db';
```

With:
```js
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { query } from '@/lib/db';
import { EXTRACTION_SYSTEM_PROMPT, crossReference } from '@/lib/keywords';
```

- [ ] **Step 2: Add the Pass 1 extraction function**

After the imports and before `export async function POST`, add:

```js
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
    // Non-fatal: if extraction fails, return empty so Pass 2 still runs
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
```

- [ ] **Step 3: Add the keyword checklist builder function**

After `extractKeywords`, add:

```js
function buildKeywordChecklist(resumeMatch) {
  if (!resumeMatch || resumeMatch.length === 0) return '';
  const list = resumeMatch.map((term) => `- ${term}`).join('\n');
  return `\n\nMANDATORY KEYWORD CHECKLIST — every term below MUST appear verbatim (exact spelling and casing as written) at least once somewhere in the resume output:\n${list}`;
}
```

- [ ] **Step 4: Update the POST handler to use the two-pass pipeline**

Replace the entire body of the `try` block inside `POST` (from `const { jobDescription }` through the DB save) with:

```js
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
```

The `catch` block and closing `}` of the function stay unchanged.

- [ ] **Step 5: Increase maxDuration to account for two API calls**

Find:
```js
export const maxDuration = 60;
```

Replace with:
```js
export const maxDuration = 120;
```

- [ ] **Step 6: Verify the route compiles**

```bash
cd "/Users/olumide/Documents/Vibe coding/Resume-Builder/resume-engine"
npm run build 2>&1 | tail -20
```

Expected: build completes with no errors. If there's a module resolution error for `@/lib/keywords`, check the import path matches the actual filename `keywords.js`.

- [ ] **Step 7: Commit**

```bash
git add app/api/generate/route.js
git commit -m "feat: two-pass pipeline — extract keywords in Pass 1, inject as constraints in Pass 2"
```

---

## Task 4: Add GapsPanel to page.js

**Files:**
- Modify: `app/page.js`

The gaps panel appears between the tab bar and the tab content when `result.gaps` has at least one non-empty category.

- [ ] **Step 1: Add a hasGaps helper and GapsPanel component**

In `page.js`, after the `CopyButton` component definition (around line 99), add:

```jsx
// ─── Gaps Panel ─────────────────────────────────────────────────────
function GapsPanel({ gaps }) {
  const sections = [
    { label: 'Tools', items: gaps?.tools || [] },
    { label: 'Skills', items: gaps?.skills || [] },
    { label: 'Soft skills', items: gaps?.soft_skills || [] },
  ].filter((s) => s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <div
      className="mb-6 rounded-lg border px-4 py-3"
      style={{ borderColor: '#7C5A2E', background: 'rgba(124,90,46,0.08)' }}
    >
      <p className="text-xs font-semibold mb-2" style={{ color: '#E8A54B' }}>
        Skills gap detected
      </p>
      <p className="text-xs mb-3" style={{ color: '#9E9088' }}>
        These items appear in the job description but are not in your base resume. Consider adding them if you have relevant experience.
      </p>
      <div className="flex flex-col gap-2">
        {sections.map(({ label, items }) => (
          <div key={label} className="flex gap-2 flex-wrap items-start">
            <span className="text-xs font-medium shrink-0" style={{ color: '#9E9088', minWidth: '64px' }}>
              {label}:
            </span>
            <div className="flex flex-wrap gap-1">
              {items.map((item) => (
                <span
                  key={item}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(124,90,46,0.2)', color: '#E8A54B', border: '1px solid rgba(124,90,46,0.4)' }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render GapsPanel in the results area**

In the results section, find the `{/* Tab Content */}` comment (around line 642). Insert the `GapsPanel` immediately before it:

Find:
```jsx
                {/* Tab Content */}
```

Replace with:
```jsx
                {/* Gaps Panel */}
                <GapsPanel gaps={result.gaps} />

                {/* Tab Content */}
```

- [ ] **Step 3: Verify the UI renders correctly without gaps**

Start the dev server and generate a resume. If `result.gaps` is `{ tools: [], skills: [], soft_skills: [] }`, the panel should not appear at all (the `if (sections.length === 0) return null` handles this).

```bash
cd "/Users/olumide/Documents/Vibe coding/Resume-Builder/resume-engine"
npm run dev
```

Open `http://localhost:3000`, paste a job description, generate. The panel should only appear if there are actual gaps.

- [ ] **Step 4: Commit**

```bash
git add app/page.js
git commit -m "feat: add gaps notification panel to surface missing skills/tools from JD"
```

---

## Task 5: End-to-End Verification

- [ ] **Step 1: Generate with the Mastercard JD**

Paste the Mastercard job description from `Samples/Mastercard job description.md` into the running app and generate.

- [ ] **Step 2: Verify keyword injection worked**

In the generated resume, search (Cmd+F in the browser) for these terms that were missing before:
- `New Product Development`
- `feasibility`
- `digital products`
- `cross-functional team`
- `data-driven` and `data driven`

Each should appear verbatim at least once.

- [ ] **Step 3: Verify gaps panel shows correctly**

The panel should show:
- **Tools:** Adobe Illustrator (and possibly Sketch)
- **Skills:** Data Modeling (and possibly others not in the base resume)
- **Soft skills:** Empathetic (and possibly Creative, Confidentiality)

- [ ] **Step 4: Verify no fabrication**

Confirm that Adobe Illustrator does NOT appear anywhere in the generated resume text — it should only appear in the gaps panel.

- [ ] **Step 5: Test with a second, unrelated JD**

Paste a JD from a different domain (e.g. a software engineering or marketing role) to confirm the extraction generalises correctly and doesn't hard-code Mastercard terms.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: verify two-pass pipeline end-to-end with Mastercard JD"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Pass 1 extraction call — Task 2 + Task 3
- ✅ Full-document scan including boilerplate — covered in EXTRACTION_SYSTEM_PROMPT rules
- ✅ All keyword categories (hard, soft, tools, phrases, variants) — Task 2
- ✅ Cross-reference against base resume — Task 2 `crossReference()`
- ✅ `resume_match` injected as hard constraints — Task 3 `buildKeywordChecklist()`
- ✅ `gaps` never fabricated into resume — `result.gaps = gaps` assigned after generation, not passed to Claude
- ✅ `gaps` field added to API response — Task 3 Step 4
- ✅ UI gap notification panel — Task 4
- ✅ System prompt Phase 1 updated — Task 1 Steps 4-5
- ✅ BASE_RESUME exported separately — Task 1 Steps 1-3
- ✅ maxDuration increased for two calls — Task 3 Step 5
- ✅ Pass 1 failure is non-fatal — Task 3 Step 2 (returns empty extracted on error, pipeline continues)

**No placeholders:** All code blocks are complete and self-contained.

**Type consistency:** `crossReference()` defined in Task 2 returns `{ resume_match: string[], gaps: { tools, skills, soft_skills } }` — consumed in Task 3 Step 4 as `const { resume_match, gaps } = crossReference(extracted)`. Consistent throughout.
