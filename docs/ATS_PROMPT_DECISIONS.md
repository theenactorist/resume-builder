# General ATS content guidance

Reviewed on October 10, 2026. Scope: the tailoring prompt in `lib/system-prompt.js`. Candidate facts still come only from the supplied base resume. No ATS detection, vendor routing, score changes, schema changes, live AI calls, or export redesign.

## Added or clarified

| Guidance | Decision and basis |
| --- | --- |
| Conventional section names | Keep H2 headings, with recognizable names only for sections the source supports. Greenhouse documents unclear sections and inconsistent formats as parsing risks; RChilli flags missing section headings. |
| Sequential text | Request single-column-friendly Markdown, standard bullets, and no generated tables, text boxes, image text, decorative icons, or skill bars. Greenhouse lists complex layouts, columns, images, and contact details outside the document body as possible parsing problems. Preserve the application's contact and role/date `|||` delimiters. |
| Explicit education details | Keep supplied degree/credential, field, institution, and graduation/completion information together. Preserve expected or in-progress status. RChilli separates education fields and flags a degree without its institution. Missing information stays missing. |
| Source date precision | Keep existing values and granularity, with date ranges on one line. Never manufacture months for year-only dates or turn a season into a month. RChilli documents missing dates and vertically split ranges; the no-invention rule takes precedence over the screenshots' date-format preferences. |
| Visible existing URLs | Show the supplied URL itself as text or a link label. This is a readability choice derived from the iCIMS screenshot, not a verified claim that all ATS discard hyperlinks. Existing URLs are preserved without changes. |
| Natural terminology and acronyms | Use job terms only for affirmative source-supported experience. Pair an acronym and full phrase only when they are unambiguously the same skill or credential; retain ambiguous abbreviations. This is a clarity choice, not a claim about vendor synonym matching. Never alter actual titles or add qualifications to match a job. |
| Candidate review notes | Use the existing `six_second_test` field for materially unclear education, dates, or contact details. Do not invent details, insert placeholders into the resume, or equate missing information with lack of a qualification. |

## Already present and retained

- Source-only facts; preserved names, contact details, URLs, employers, actual titles, chronology, education, certifications, numbers, and metrics.
- Supported keyword use with affirmative-context checks; unmatched phrases remain lexical hints rather than conclusive qualification gaps.
- H1 name, H2 sections, H3 role/date delimiter, italic employer, and the existing JSON response fields.
- Heuristic ATS scores without real-ATS or outcome guarantees; source-grounded before/after revisions.
- Image rejection in generation validation; text-based PDF input with review of extracted text; visitor privacy safeguards.

## Deliberately excluded

Vendor detection or routing; exact-match, synonym, stemming, plural, ranking, scorecard, search-order, or automatic-disqualification claims; keyword repetition as a ranking tactic; replacing actual titles with target titles; inferred months/dates or credentials; vendor-specific file-format and size mandates; application timing, screening answers, or external LinkedIn edits. These are either unverified, outside the tailoring prompt, or conflict with source fidelity.

## Evidence

Primary documentation checked:

- [Greenhouse: Unsuccessful resume parse](https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse) — formatting issues that may cause failed or partial parsing; not universal ATS ranking behavior.
- [RChilli: Resume Quality](https://docs.rchilli.com/kc/c_Rchilli_resume_parser_resume_quality) — specific missing-field, heading, column, and date-range checks. Its PDF and separate-skills-section preferences were not adopted.
- [RChilli: Oracle supported data fields](https://docs.rchilli.com/kc/Supported_Data_Fields) — separate employment, education, credential, and social-link fields. This does not make any missing field mandatory for every candidate.

User-supplied Jobscan screenshots inspected in `../ATS rules`:

| Filename | Visible ATS label |
| --- | --- |
| `Screenshot 2026-10-02 at 9.18.05 PM.png` | Ashby |
| `Screenshot 2026-10-02 at 9.18.31 PM.png` | Jobvite |
| `Screenshot 2026-10-02 at 9.18.52 PM.png` | Workday |
| `Screenshot 2026-10-02 at 9.20.23 PM.png` | Greenhouse |
| `Screenshot 2026-10-06 at 9.49.02 AM.png` | Lever |
| `Screenshot 2026-10-10 at 10.26.16 PM.png` | iCIMS |

These are third-party guidance snapshots, not vendor specifications. Repeated content-clarity advice informed the changes; vendor mechanics did not.

## Validation and limits

The source/truth rules and JSON schema are byte-identical to their prior versions. The existing renderer contract is preserved. All 26 existing tests passed, the production build passed, and the Git diff passed its whitespace check. Only the prompt and this note changed. Automated tests use mocked AI responses and synthetic PDFs; they do not measure real model obedience or real ATS acceptance. Validation used no live AI call, billing change, or resume submission. The owner subsequently authorized a focused commit and push of this prompt and decision note; the connected Railway integration may deploy that push. The prior prompt and exact patch were saved separately for rollback.

This change controls generated Markdown content. The existing preview and DOCX renderer still use a small table for role/date alignment and a floated contact block; this prompt update does not change or certify export parsing. Export-layout work would be a separate change.
