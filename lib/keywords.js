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
      if (!gaps.skills.includes(form1)) gaps.skills.push(form1);
      if (!gaps.skills.includes(form2)) gaps.skills.push(form2);
    }
  }

  return {
    resume_match: [...resume_match],
    gaps,
  };
}
