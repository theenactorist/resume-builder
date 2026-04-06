# Two-Pass Keyword Pipeline — Design Spec
**Date:** 2026-04-06
**Status:** Approved

---

## Problem

The resume engine generates high-quality targeted resumes but misses a class of keyword matches that tools like Jobscan catch. Root causes identified from a Mastercard JD benchmark:

1. **Paraphrasing over exact-match** — Claude substitutes synonyms ("de-risk" for "feasibility", "cross-functional collaboration" for "cross-functional team") instead of injecting the JD's exact phrasing
2. **Top-N extraction drops long-tail keywords** — the current prompt extracts "top 7 hard skills + top 5 soft skills", missing lower-frequency but ATS-matchable terms like "digital products", "product solutions", "empathetic", "Adobe Illustrator"
3. **No hyphenation variant coverage** — "data-driven" and "data driven" are separate ATS tokens; only one form gets injected
4. **Boilerplate sections ignored** — terms like "confidentiality" appear in JD footer sections the engine doesn't scan
5. **Tools list incompleteness** — tools listed as "Nice to Have" get silently dropped
6. **No gap transparency** — when a JD requires a skill or tool not in the base resume, the engine silently omits it rather than surfacing it to the user

---

## Solution: Two-Pass Pipeline

Replace the single Claude call with two sequential calls inside the existing API route. The frontend receives the same JSON shape — no UI contract changes, except the addition of a `gaps` field.

---

## Pass 1 — Keyword Extraction

A fast, focused Claude call. Input: raw JD text only. Output: structured JSON.

**System prompt teaches extraction of:**
- **Role-specific phrases** — exact multi-word terms naming the team, methodology, product type (e.g. "New Product Development", "Lean UX", "design and development")
- **All named tools** — every tool mentioned anywhere in the JD, including Nice-to-Have sections (e.g. "Adobe Illustrator", "Sketch")
- **Soft skill adjectives** — descriptors from "About You" / "All About You" sections (e.g. "empathetic", "creative", "collaborative")
- **Hyphenation variants** — when a term appears both hyphenated and unhyphenated, both forms are captured as a pair
- **Full-document scan** — including boilerplate/legal/security footer sections
- **Exact compound phrases** — multi-word terms that must match as a unit

**Output schema:**
```json
{
  "hard_skills": ["string"],
  "soft_skills": ["string"],
  "tools": ["string"],
  "phrases": ["string"],
  "variants": [["hyphenated-form", "unhyphenated form"]]
}
```

**Budget:** ~500 max_tokens. This call is cheap and fast — extraction only, no prose generation.

---

## Pass 1.5 — Base Resume Cross-Reference

After extraction, the API route splits extracted keywords into two buckets by checking against the base resume text (which is embedded in the system prompt string):

- **`resume_match`** — terms that exist in the base resume → passed to Pass 2 as hard constraints
- **`gaps`** — terms that do NOT exist in the base resume → surfaced to the user, never fabricated

**Gap categorisation:**
```json
{
  "gaps": {
    "tools": ["Adobe Illustrator", "Sketch"],
    "skills": ["Data Modeling", "Feasibility analysis"],
    "soft_skills": ["Empathetic"]
  }
}
```

The cross-reference is a string-match operation on the base resume text extracted from `SYSTEM_PROMPT`. No additional API call required.

---

## Pass 2 — Resume Generation

The existing Claude generation call, with one addition: the `resume_match` keyword list is appended to the user message as an explicit hard constraint block:

```
MANDATORY KEYWORD CHECKLIST — every term below must appear verbatim at least once in the resume output:
- New Product Development
- feasibility
- digital products
- cross-functional team
- data-driven
- data driven
...
```

The existing system prompt (Phases 1–4: analysis, resume, cover letter, QA) is otherwise unchanged except:
- Phase 1 Step B: remove "top 7 hard / top 5 soft" cap — extraction is now handled by Pass 1
- Phase 1 Step C: reference the injected keyword checklist instead of self-deriving keywords

**Budget:** unchanged (~8000 max_tokens)

---

## API Response Shape

The existing response fields are unchanged. One field is added:

```json
{
  "resume": "...",
  "cover_letter": "...",
  "ats_score": { ... },
  "before_after": [ ... ],
  "company_name": "...",
  "job_title": "...",
  "gaps": {
    "tools": ["Adobe Illustrator"],
    "skills": ["Data Modeling"],
    "soft_skills": ["Empathetic"]
  }
}
```

If there are no gaps, `gaps` contains empty arrays. Never omitted from response.

---

## Files Changed

| File | Change |
|---|---|
| `app/api/generate/route.js` | Add Pass 1 extraction call; add cross-reference logic; inject `resume_match` into Pass 2 user message; include `gaps` in response |
| `lib/system-prompt.js` | Update Phase 1 Step B (remove top-N cap); update Phase 1 Step C (reference injected checklist) |
| `app/page.js` | Display `gaps` as a notification panel if any gaps exist |

---

## Constraints

- **Never fabricate** — the engine must not add skills, tools, or experience not present in the base resume
- **Gap items are informational only** — shown to the user as awareness, not inserted into the resume
- **JD-agnostic** — the extraction logic must generalise to any JD, not be tuned to Mastercard
- **Same response contract** — existing UI tabs (resume, cover letter, ATS, before/after) are unaffected
- **Cost target** — total per-generation cost should stay under ~$0.15 USD (Pass 1 adds ~$0.02-0.03)

---

## Success Criteria

- Keywords Jobscan would extract from any JD appear verbatim in the generated resume, provided they exist in the base resume
- Missing tools and skills are surfaced to the user rather than silently dropped
- No keywords are invented that aren't in the base resume
- Existing resume quality (bullet structure, cover letter, ATS analysis) is unchanged
