'use client';

import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { asBlob } from 'html-docx-js-typescript';

// ─── Icons (inline SVG) ─────────────────────────────────────────────
const Icons = {
  Copy: () => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Check: () => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  Sparkle: () => (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M5.5 7.5 12 3l6.5 4.5M5.5 16.5 12 21l6.5-4.5" />
    </svg>
  ),
  Download: () => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Arrow: () => (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Clock: () => (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Plus: () => (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Sidebar: () => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  ),
};

// Copy and export tools stay beside the application draft.
function CopyButton({ text, contentId, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(null);

  const handleCopy = useCallback(async () => {
    setCopyError(null);
    let plainText = text;
    try {
      const el = contentId ? document.getElementById(contentId) : null;
      if (el) {
        const html = el.innerHTML;
        plainText = el.innerText;
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        })]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(plainText);
      } catch {
        setCopyError('Copy is unavailable. Try exporting the document instead.');
        return;
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text, contentId]);

  return (
    <div className="export-control">
      <button type="button" onClick={handleCopy} className="button button-secondary button-small" data-copied={copied}>
        {copied ? <Icons.Check /> : <Icons.Copy />}
        {copied ? 'Copied' : label}
      </button>
      {copyError && <p role="alert" className="field-error export-error">{copyError}</p>}
    </div>
  );
}

function ColdMessageCard({ label, message, subject }) {
  const wordCount = message ? message.trim().split(/\s+/).length : 0;
  return (
    <article className="message-card">
      <div className="card-heading-row">
        <h3>{label}</h3>
        <div className="message-tools">
          <span className="metadata tabular-nums">{wordCount} words</span>
          <CopyButton text={message || ''} />
        </div>
      </div>
      {subject && (
        <div className="message-subject">
          <div>
            <p className="metadata">Subject</p>
            <p className="subject-text">{subject}</p>
          </div>
          <CopyButton text={subject} />
        </div>
      )}
      <p className="message-body">{message || 'No message generated.'}</p>
    </article>
  );
}

function GapsPanel({ gaps }) {
  const sections = [
    { label: 'Tools', items: gaps?.tools || [] },
    { label: 'Skills', items: gaps?.skills || [] },
    { label: 'Soft skills', items: gaps?.soft_skills || [] },
  ].filter((section) => section.items.length > 0);
  if (sections.length === 0) return null;

  return (
    <details className="gaps-panel">
      <summary>Keywords to review</summary>
      <p>These exact terms were not matched in your base resume. Some may describe experience you already have in different words. Check each requirement before adding it.</p>
      <div className="gap-groups">
        {sections.map(({ label, items }) => (
          <div className="gap-group" key={label}>
            <span className="gap-label">{label}</span>
            <div className="tag-list">{items.map((item) => <span className="tag tag-warning" key={item}>{item}</span>)}</div>
          </div>
        ))}
      </div>
    </details>
  );
}

function buildFilename(result, type, ext) {
  const sanitize = (s) => (s || '').replace(/[/\\:*?"<>|]/g, '').trim();
  const name = sanitize(result?.candidate_name) || 'Applicant';
  const role = sanitize(result?.job_title);
  const company = sanitize(result?.company_name);
  const segments = [name, role, company, type].filter(Boolean);
  return `${segments.join('-')}.${ext}`;
}

function ExportButton({ content, filename }) {
  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button type="button" onClick={handleExport} className="button button-secondary button-small" title="Exports the original generated text">
      <Icons.Download />
      Markdown
    </button>
  );
}

function ExportDocxButton({ contentId, filename }) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const exportPending = useRef(false);

  const handleExport = async () => {
    if (exportPending.current) return;
    const el = document.getElementById(contentId);
    if (!el) {
      setExportError('Open the document you want to export and try again.');
      return;
    }

    // Capture the current artboard, including visitor edits, before conversion.
    const artboardHtml = el.innerHTML;
    const documentStyles = typeof window !== 'undefined' ? window.getComputedStyle(document.documentElement) : null;
    const documentInk = documentStyles?.getPropertyValue('--forest-ink').trim() || '#15372C';
    const documentAccent = documentStyles?.getPropertyValue('--leaf-green').trim() || '#008561';
    const documentMuted = documentStyles?.getPropertyValue('--muted-ink').trim() || '#5B6D65';
    const htmlContent = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 2.5cm; }
          body { font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.5; color: ${documentInk}; }
          h1 { font-size: 22pt; font-weight: 700; color: ${documentInk}; margin: 0 0 4px 0; }
          h2 { font-size: 10pt; font-weight: 700; text-transform: uppercase; border-bottom: 1.5px solid ${documentAccent}; padding-bottom: 3px; margin-top: 16px; margin-bottom: 8px; color: ${documentAccent}; }
          h3 { font-size: 11pt; font-weight: 600; margin-top: 18px; margin-bottom: 4px; }
          p { margin-bottom: 4px; font-size: 10.5pt; }
          ul { padding-left: 20px; margin-bottom: 6px; }
          li { margin-bottom: 4px; font-size: 10.5pt; }
          a { color: ${documentInk}; text-decoration: underline; }
          .resume-contact { float: right; text-align: right; font-size: 9pt; color: ${documentMuted}; line-height: 1.75; }
          table.exp-table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          table.exp-table td { padding: 0; vertical-align: bottom; }
          .exp-left { text-align: left; }
          .exp-right { text-align: right; white-space: nowrap; }
          table.exp-table h3 { margin: 0; }
        </style>
      </head>
      <body>${artboardHtml}</body>
      </html>
    `;

    exportPending.current = true;
    setExporting(true);
    setExportError(null);
    let downloadUrl;
    let anchor;
    try {
      const converted = await asBlob(htmlContent, {
        orientation: 'portrait',
        margins: { top: 1417, right: 1417, bottom: 1417, left: 1417 },
      });
      const blob = new Blob([converted], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      downloadUrl = URL.createObjectURL(blob);
      anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
    } catch {
      setExportError('Could not export the Word document. Please try again.');
    } finally {
      anchor?.remove();
      if (downloadUrl) setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      exportPending.current = false;
      setExporting(false);
    }
  };

  return (
    <div className="export-control">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        aria-busy={exporting}
        className="button button-secondary button-small"
      >
        <Icons.Download />
        {exporting ? 'Preparing Word...' : 'Word (.docx)'}
      </button>
      {exportError && <p role="alert" className="field-error export-error">{exportError}</p>}
    </div>
  );
}

function ExportPdfButton({ filename }) {
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);
  const printPending = useRef(false);

  const handlePrint = () => {
    if (printPending.current) return;
    const originalTitle = document.title;
    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreTitle);
      printPending.current = false;
      setPrinting(false);
    };

    printPending.current = true;
    setPrinting(true);
    setPrintError(null);
    document.title = filename || originalTitle;
    window.addEventListener('afterprint', restoreTitle, { once: true });
    try {
      window.print();
    } catch {
      restoreTitle();
      setPrintError('Could not open the print dialog. Please try again.');
    }
  };

  return (
    <div className="export-control">
      <button type="button" onClick={handlePrint} disabled={printing} aria-busy={printing} className="button button-secondary button-small">
        <Icons.Download />
        {printing ? 'Printing...' : 'PDF'}
      </button>
      {printError && <p role="alert" className="field-error export-error">{printError}</p>}
    </div>
  );
}

function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <nav className="review-nav" aria-label="Application draft views">
      {tabs.map((tab) => (
        <button type="button" key={tab.id} onClick={() => onTabChange(tab.id)} className="review-tab" aria-pressed={activeTab === tab.id}>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function ScoreRing({ score, label, size = 80 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const tone = score >= 80 ? 'strong' : score >= 60 ? 'partial' : 'limited';
  return (
    <div className="score-item" data-tone={tone}>
      <div className="score-ring" style={{ width: size, height: size }}>
        <svg aria-hidden="true" width={size} height={size} className="score-graphic">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="score-track" strokeWidth="4" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <span className="score-value tabular-nums">{score}</span>
      </div>
      <p className="score-label">{label}</p>
    </div>
  );
}

function BeforeAfterCard({ item, index }) {
  return (
    <article className="comparison-card">
      <h3 className="comparison-heading">Bullet {index + 1}</h3>
      <div className="comparison-columns">
        <div><p className="comparison-label">Before</p><p>{item.before}</p></div>
        <div><p className="comparison-label">After</p><p>{item.after}</p></div>
      </div>
      <p className="comparison-reason"><span>Why it changed</span> {item.why}</p>
    </article>
  );
}

function LoadingState() {
  return (
    <section className="loading-card" role="status" aria-live="polite">
      <h2>Preparing your application...</h2>
      <p>Matching your experience to the role and creating your documents.</p>
      <div className="draft-skeleton" aria-hidden="true"><div /><div /><div /><div /></div>
    </section>
  );
}

function HistorySidebar({ history, activeId, onSelect, onNewGeneration, isOpen, disabled }) {
  if (!isOpen || history.length === 0) return null;
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <aside id="visitor-history" className="session-card" aria-labelledby="history-title">
      <div className="session-heading">
        <h2 id="history-title">Current session</h2>

      </div>
      <p className="session-intro">Keep working with your experience. Create a new draft for another role.</p>
      <button type="button" onClick={onNewGeneration} disabled={disabled} className="button button-secondary session-new">
        <Icons.Plus /> New draft
      </button>
      {history.length === 0 ? (
        <div className="session-empty"><p>No drafts yet.</p><p>Your generated applications will appear here.</p></div>
      ) : (
        <div className="session-list">
          {history.map((item) => (
            <button type="button" key={item.id} onClick={() => onSelect(item.id)} disabled={disabled} aria-pressed={activeId === item.id} className="session-item">
              <span className="session-company">{item.company_name || 'Application'}</span>
              {item.job_title && <span className="session-role">{item.job_title}</span>}
              <span className="session-date tabular-nums">{formatDate(item.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

function AnalysisSummary({ analysis }) {
  if (!analysis) return null;
  const groups = [
    { label: 'Hard skills', items: analysis.hard_skills || [] },
    { label: 'Soft skills', items: analysis.soft_skills || [] },
    { label: 'Keywords', items: analysis.keyword_map?.slice(0, 12) || [] },
  ];
  return (
    <section className="analysis-summary" aria-labelledby="analysis-title">
      <h3 id="analysis-title">Role requirements</h3>
      <div className="analysis-columns">{groups.map(({ label, items }) => (
        <div key={label}><h4>{label}</h4><div className="tag-list">{items.map((item, index) => <span className="tag" key={index}>{item}</span>)}</div></div>
      ))}</div>
    </section>
  );
}

function PrivacyDisclosure() {
  return <p className="privacy-disclosure">Your resume, job description, and optional note are sent to Claude for generation. PDFs are processed to extract text. Inputs and history stay in this tab’s memory; reload or close to clear them. Export drafts you want to keep.</p>;
}

// Renderer identities stay stable while visitors edit the document in place.
const RESUME_MARKDOWN_COMPONENTS = {
  img: () => null,
  p: ({ children }) => {
    // Detect contact block: paragraph containing ||| separators
    const childArray = Array.isArray(children) ? children : [children];
    const fullText = childArray.map(c => (typeof c === 'string' ? c : '')).join('');
    if (fullText.includes('|||')) {
      // Split on ||| to get individual contact items
      const items = [];
      childArray.forEach((child) => {
        if (typeof child === 'string') {
          child.split('|||').forEach((seg) => {
            if (seg.trim()) items.push(seg.trim());
          });
        } else {
          items.push(child);
        }
      });
      return (
        <div className="resume-contact">
          {items.map((item, i) => <div key={i}>{item}</div>)}
        </div>
      );
    }
    return <p>{children}</p>;
  },
  h3: ({ children }) => {
    const childArray = Array.isArray(children) ? children : [children];

    // Check if any child contains the ||| delimiter
    const fullText = childArray.map(c => (typeof c === 'string' ? c : '')).join('');
    if (fullText.includes('|||')) {
      // Split children into left and right parts at the ||| delimiter
      const leftParts = [];
      const rightParts = [];
      let foundDelimiter = false;

      childArray.forEach((child) => {
        if (typeof child === 'string' && child.includes('|||')) {
          const [left, right] = child.split('|||');
          if (left.trim()) leftParts.push(left.trim());
          foundDelimiter = true;
          if (right?.trim()) rightParts.push(right.trim());
        } else if (!foundDelimiter) {
          leftParts.push(child);
        } else {
          rightParts.push(child);
        }
      });

      return (
        <table className="exp-table">
          <tbody>
            <tr>
              <td className="exp-left">
                <h3>{leftParts}</h3>
              </td>
              <td className="exp-right">
                <h3>{rightParts}</h3>
              </td>
            </tr>
          </tbody>
        </table>
      );
    }
    return <h3>{children}</h3>;
  }
};
const COVER_MARKDOWN_COMPONENTS = { img: () => null };

function sanitizeDocumentHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const allowedTags = new Set(['A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'I', 'LI', 'OL', 'P', 'PRE', 'S', 'SPAN', 'STRONG', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'U', 'UL']);
  const blockedTags = new Set(['AUDIO', 'EMBED', 'IFRAME', 'IMG', 'INPUT', 'LINK', 'MATH', 'OBJECT', 'PICTURE', 'SCRIPT', 'SOURCE', 'STYLE', 'SVG', 'VIDEO']);
  const allowedClasses = new Set(['resume-contact', 'exp-table', 'exp-left', 'exp-right']);
  for (const element of template.content.querySelectorAll('*')) {
    if (!allowedTags.has(element.tagName)) {
      if (blockedTags.has(element.tagName)) element.remove();
      else element.replaceWith(...element.childNodes);
      continue;
    }
    const classes = [...element.classList].filter((name) => allowedClasses.has(name));
    const href = element.tagName === 'A' ? element.getAttribute('href') : null;
    for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
    if (classes.length) element.className = classes.join(' ');
    if (href) {
      try {
        const url = new URL(href, 'https://resume-engine.invalid');
        if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) element.setAttribute('href', href);
      } catch { /* Keep invalid links as readable text. */ }
    }
  }
  return template.innerHTML;
}

function EditableDocument({ contentId, source, components, label, isEditing, savedHtml, onSnapshot }) {
  const documentRef = useRef(null);
  const initialHtml = useRef(savedHtml);
  // Reusing this exact element prevents React from reconciling visitor-edited children.
  const markup = useMemo(() => <ReactMarkdown components={components}>{source}</ReactMarkdown>, [source, components]);
  useLayoutEffect(() => {
    if (initialHtml.current !== undefined && documentRef.current) {
      documentRef.current.innerHTML = sanitizeDocumentHtml(initialHtml.current);
    }
  }, []);
  const captureSnapshot = (event) => onSnapshot(sanitizeDocumentHtml(event.currentTarget.innerHTML));
  return (
    <div
      ref={documentRef} className="resume-paper" id={contentId} data-editing={isEditing}
      role={isEditing ? 'textbox' : undefined} aria-label={isEditing ? label : undefined}
      aria-multiline={isEditing || undefined} contentEditable={isEditing ? 'plaintext-only' : false}
      suppressContentEditableWarning={true} onInput={captureSnapshot} onBlur={captureSnapshot}
    >{markup}</div>
  );
}

export default function Home() {
  const [baseResume, setBaseResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyHook, setCompanyHook] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('resume');
  const [history, setHistory] = useState([]);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [touched, setTouched] = useState({});
  const generationPending = useRef(false);
  const [inputsExpanded, setInputsExpanded] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadMessage, setUploadMessage] = useState(null);
  const extractionPending = useRef(false);
  const fileInputRef = useRef(null);
  const reviewHeadingRef = useRef(null);
  const documentSnapshots = useRef(new Map());

  useEffect(() => {
    if (result && !inputsExpanded) reviewHeadingRef.current?.focus();
  }, [result, inputsExpanded]);

  const tabs = [
    { id: 'resume', label: 'Resume' },
    { id: 'cover_letter', label: 'Cover Letter' },
    { id: 'ats', label: 'ATS Score' },
    { id: 'before_after', label: 'Before / After' },
    { id: 'cold_messages', label: 'Cold Messages' },
  ];

  const inputErrors = {
    baseResume: baseResume.trim().length < 100
      ? 'Paste at least 100 characters from your base resume.'
      : baseResume.length > 30000 ? 'Use 30,000 characters or fewer for your base resume.' : null,
    jobDescription: jobDescription.trim().length < 50
      ? 'Paste at least 50 characters from the job description.'
      : jobDescription.length > 30000 ? 'Use 30,000 characters or fewer for the job description.' : null,
    companyHook: companyHook.length > 1000 ? 'Use 1,000 characters or fewer for the company note.' : null,
  };
  const busy = loading || extracting;
  const canGenerate = !Object.values(inputErrors).some(Boolean) && !extracting;
  const activeDraft = history.find((item) => item.id === activeHistoryId);
  const draftInputsChanged = Boolean(result && activeDraft && (
    baseResume.trim() !== activeDraft.baseResume ||
    jobDescription.trim() !== activeDraft.jobDescription ||
    companyHook.trim() !== activeDraft.companyHook
  ));
  const markTouched = (field) => setTouched((previous) => ({ ...previous, [field]: true }));
  const saveDocumentSnapshot = (kind, html) => {
    if (!activeHistoryId) return;
    const previous = documentSnapshots.current.get(activeHistoryId) || {};
    documentSnapshots.current.set(activeHistoryId, { ...previous, [kind]: html });
  };

  const handleSelectHistory = (id) => {
    if (generationPending.current || extractionPending.current) return;
    const item = history.find((entry) => entry.id === id);
    if (!item) return;
    setResult(item.result);
    setInputsExpanded(false);
    setSidebarOpen(false);
    setUploadError(null);
    setUploadMessage(null);
    setBaseResume(item.baseResume);
    setJobDescription(item.jobDescription);
    setCompanyHook(item.companyHook);
    setActiveHistoryId(id);
    setActiveTab('resume');
    setIsEditing(false);
    setTouched({});
    setError(null);
  };

  const handleNewGeneration = () => {
    if (generationPending.current || extractionPending.current) return;
    setInputsExpanded(true);
    setSidebarOpen(false);
    setUploadError(null);
    setUploadMessage(null);
    setResult(null);
    setActiveHistoryId(null);
    setJobDescription('');
    setCompanyHook('');
    setError(null);
    setTouched({});
    setIsEditing(false);
    setActiveTab('resume');
  };

  const handlePdfUpload = async (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || generationPending.current || extractionPending.current) return;
    setUploadError(null);
    setUploadMessage(null);
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
      setUploadError('Choose a PDF file, or paste your resume below.');
      return;
    }
    if (!file.size || file.size > 5 * 1024 * 1024) {
      setUploadError('Choose a nonempty PDF of 5 MiB or less.');
      return;
    }

    extractionPending.current = true;
    setExtracting(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/resume/extract', { method: 'POST', body });
      let data;
      try { data = await response.json(); }
      catch { throw new Error('Could not read the PDF response. Please paste your resume instead.'); }
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not read this PDF. Please paste your resume instead.');
      if (!Number.isInteger(data.pageCount) || data.pageCount < 1 || data.pageCount > 30) {
        throw new Error('Choose a PDF with 30 pages or fewer.');
      }
      if (typeof data.text !== 'string' || data.text.trim().length < 100) {
        throw new Error('This PDF does not contain enough readable text. Try a text-based PDF, or paste your resume.');
      }
      if (data.text.trim().length > 30000) {
        throw new Error('The PDF contains more than 30,000 characters. Paste a shorter resume instead.');
      }
      setBaseResume(data.text.trim());
      setTouched((previous) => ({ ...previous, baseResume: true }));
      setUploadMessage(`Text loaded from ${data.pageCount} ${data.pageCount === 1 ? 'page' : 'pages'}. Review and correct it before generating.`);
    } catch (err) {
      setUploadError(err.message || 'Could not read this PDF. Please paste your resume instead.');
    } finally {
      extractionPending.current = false;
      setExtracting(false);
    }
  };

  const handleGenerate = async () => {
    setTouched({ baseResume: true, jobDescription: true, companyHook: true });
    if (!canGenerate || generationPending.current || extractionPending.current) return;

    generationPending.current = true;
    setInputsExpanded(true);
    const inputs = {
      baseResume: baseResume.trim(),
      jobDescription: jobDescription.trim(),
      companyHook: companyHook.trim(),
    };
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveHistoryId(null);
    setIsEditing(false);
    setActiveTab('resume');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed. Please try again.');

      const id = crypto.randomUUID();
      setResult(data);
      setInputsExpanded(false);
      setSidebarOpen(false);
      setHistory((previous) => [{
        id,
        created_at: new Date().toISOString(),
        company_name: data.company_name,
        job_title: data.job_title,
        result: data,
        ...inputs,
      }, ...previous]);
      setActiveHistoryId(id);
    } catch (err) {
      setError(err.message || 'Generation failed. Please try again.');
    } finally {
      generationPending.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="resume-app">
      <header className="site-header">
        <div className="site-header-inner">
          <span className="wordmark">Resume Engine</span>
          {history.length > 0 && (
            <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="button button-header" aria-label={sidebarOpen ? 'Hide history' : 'Show history'} aria-expanded={sidebarOpen} aria-controls="visitor-history">
              <Icons.Sidebar /> Session history
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {!result && !loading && (
          <section className="intro" aria-labelledby="intro-title">
            <div className="intro-copy">
              <h1 id="intro-title">Automate your resume tailoring.</h1>
              <p>Automatically create a targeted resume, cover letter, and outreach from your resume and a job description.</p>
            </div>
            <img className="intro-illustration" src="/tailoring-illustration.png" width="280" height="187" alt="A resume and role requirements combine into a tailored application." />
          </section>
        )}

        <div className="input-layout" data-history-open={sidebarOpen && history.length > 0}>
          <div className="creation-region">
            {result && !inputsExpanded && !loading && (
              <section className="inputs-summary" aria-labelledby="inputs-summary-title">
                <div><h2 id="inputs-summary-title">Your application inputs</h2><p>{draftInputsChanged ? 'Inputs changed. Regenerate to update this application.' : 'Your resume and job description are ready to reuse.'}</p></div>
                <div className="inputs-summary-actions">
                  <button type="button" className="button button-secondary" onClick={() => setInputsExpanded(true)} disabled={busy}>Edit inputs</button>
                  <button type="button" className="button button-primary" onClick={handleGenerate} disabled={busy || !canGenerate}>Regenerate application</button>
                </div>
              </section>
            )}

            <form className="application-form" autoComplete="off" noValidate hidden={Boolean(result) && !inputsExpanded && !loading} onSubmit={(event) => { event.preventDefault(); handleGenerate(); }} aria-busy={busy}>
              {result && inputsExpanded && <div className="editing-inputs-bar"><p>Update your inputs, then generate a new application.</p><button type="button" className="button button-secondary button-small" onClick={() => setInputsExpanded(false)} disabled={busy}>Back to draft</button></div>}
              <div className="input-pair">
                <section className="input-card experience-card" aria-labelledby="experience-title">
                  <div className="step-heading">
                    <h2 id="experience-title"><label htmlFor="base-resume"><span className="step-label">Step 1</span>Enter your base resume</label></h2>
                    <button type="button" className="button button-secondary button-small upload-button" onClick={() => fileInputRef.current?.click()} disabled={busy}>{extracting ? 'Reading PDF...' : 'Upload PDF'}</button>
                    <input id="resume-pdf" name="resumePdf" ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="visually-hidden" tabIndex={-1} aria-label="Upload a resume PDF" disabled={busy} onChange={handlePdfUpload} />
                  </div>
                  <p id="base-resume-hint" className="field-hint">Paste your experience, skills, education, and contact details, or upload a text-based PDF of up to 5 MiB and 30 pages.</p>
                  {extracting && <p className="upload-message" role="status">Extracting resume text. Your current text will be replaced when the PDF is ready.</p>}
                  {uploadError && <p className="field-error upload-error" role="alert">{uploadError}</p>}
                  {uploadMessage && <p className="upload-message" role="status">{uploadMessage}</p>}
                  <textarea
                    id="base-resume" name="baseResume" value={baseResume}
                    onChange={(event) => { setBaseResume(event.target.value); setUploadMessage(null); }} onBlur={() => markTouched('baseResume')}
                    placeholder="Paste your current resume here..." rows={12} minLength={100} maxLength={30000} required disabled={busy}
                    aria-invalid={Boolean(touched.baseResume && inputErrors.baseResume)}
                    aria-describedby={`base-resume-hint base-resume-count${touched.baseResume && inputErrors.baseResume ? ' base-resume-error' : ''}`}
                    className="text-field resume-field"
                  />
                  <div className="field-details" id="base-resume-count"><span>100 characters minimum</span><span className="tabular-nums">{baseResume.length.toLocaleString('en')} / 30,000</span></div>
                  {touched.baseResume && inputErrors.baseResume && <p id="base-resume-error" className="field-error">{inputErrors.baseResume}</p>}
                </section>

                <section className="input-card role-card" aria-labelledby="role-title">
                  <div className="step-heading"><h2 id="role-title"><label htmlFor="job-description"><span className="step-label">Step 2</span>Job description</label></h2></div>
                  <p id="job-description-hint" className="field-hint">Paste the full job description so your application reflects the responsibilities, skills, and company.</p>
                  <textarea
                    id="job-description" name="jobDescription" value={jobDescription}
                    onChange={(event) => setJobDescription(event.target.value)} onBlur={() => markTouched('jobDescription')}
                    placeholder="Paste the full job description here..." rows={8} minLength={50} maxLength={30000} required disabled={busy}
                    aria-invalid={Boolean(touched.jobDescription && inputErrors.jobDescription)}
                    aria-describedby={`job-description-hint job-description-count${touched.jobDescription && inputErrors.jobDescription ? ' job-description-error' : ''}`}
                    className="text-field job-field"
                  />
                  <div className="field-details" id="job-description-count"><span>50 characters minimum</span><span className="tabular-nums">{jobDescription.length.toLocaleString('en')} / 30,000</span></div>
                  {touched.jobDescription && inputErrors.jobDescription && <p id="job-description-error" className="field-error">{inputErrors.jobDescription}</p>}
                  <label htmlFor="company-hook" className="field-label company-note-label">Company note <span>(optional)</span></label>
                  <textarea
                    id="company-hook" name="companyHook" value={companyHook}
                    onChange={(event) => setCompanyHook(event.target.value)} onBlur={() => markTouched('companyHook')}
                    placeholder="A product, value, or detail that caught your attention." rows={2} maxLength={1000} disabled={busy}
                    aria-invalid={Boolean(touched.companyHook && inputErrors.companyHook)}
                    aria-describedby={`company-hook-hint${touched.companyHook && inputErrors.companyHook ? ' company-hook-error' : ''}`}
                    className="text-field company-field"
                  />
                  <p id="company-hook-hint" className="field-details">Personalize your outreach. Up to 1,000 characters.</p>
                  {touched.companyHook && inputErrors.companyHook && <p id="company-hook-error" className="field-error">{inputErrors.companyHook}</p>}
                </section>
              </div>

              <div className="generation-row">
                <button type="submit" disabled={busy || !canGenerate} className="button button-primary generate-application">
                  {loading ? 'Generating...' : extracting ? 'Reading your PDF...' : 'Generate application'}
                  {!busy && <Icons.Arrow />}
                </button>
              </div>
              {error && <div className="generation-error" role="alert"><p>{error}</p></div>}
            </form>
          </div>

          <HistorySidebar history={history} activeId={activeHistoryId} onSelect={handleSelectHistory} onNewGeneration={handleNewGeneration} isOpen={sidebarOpen && history.length > 0} disabled={busy} />
        </div>

        {loading && <LoadingState />}

        {result && !loading && (
          <section className="review-workspace" aria-labelledby="draft-title">
            <div className="review-header">
              <div className="review-title-row"><h2 id="draft-title" ref={reviewHeadingRef} tabIndex={-1}>Your application draft</h2></div>
              {(result.job_title || result.company_name) && <p className="draft-context">{[result.job_title, result.company_name].filter(Boolean).join(' · ')}</p>}
              <p className="review-notice">Check names, dates, employers, qualifications, and claims against your resume before exporting.</p>
            </div>
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {(activeTab === 'resume' || activeTab === 'cover_letter') && (
              <div className="review-toolbar">
                <div className="export-actions">
                  <CopyButton text={activeTab === 'resume' ? result.resume : result.cover_letter} contentId={activeTab === 'resume' ? 'resume-content' : 'cover-letter-content'} />
                  <ExportButton content={activeTab === 'resume' ? result.resume : result.cover_letter} filename={buildFilename(result, activeTab === 'resume' ? 'Resume' : 'Cover Letter', 'md')} />
                  <ExportDocxButton contentId={activeTab === 'resume' ? 'resume-content' : 'cover-letter-content'} filename={buildFilename(result, activeTab === 'resume' ? 'Resume' : 'Cover Letter', 'docx')} />
                  <ExportPdfButton filename={buildFilename(result, activeTab === 'resume' ? 'Resume' : 'Cover Letter', 'pdf')} />
                  <button type="button" onClick={() => setIsEditing(!isEditing)} className="button button-secondary button-small" aria-pressed={isEditing}>{isEditing ? 'Done editing' : 'Edit document'}</button>
                </div>
                <p className="export-hint">Document edits appear in Word and PDF exports. Markdown exports the original generated text.</p>
              </div>
            )}

            <GapsPanel key={activeHistoryId || 'draft'} gaps={result.gaps} />

            {activeTab === 'resume' && (
              <div className="paper-tray">
                <p className="pdf-filename">PDF filename: <span>{buildFilename(result, 'Resume', 'pdf')}</span></p>
                <EditableDocument
                  key={`${activeHistoryId}:resume`} contentId="resume-content" source={result.resume}
                  components={RESUME_MARKDOWN_COMPONENTS} label="Resume document" isEditing={isEditing}
                  savedHtml={documentSnapshots.current.get(activeHistoryId)?.resume}
                  onSnapshot={(html) => saveDocumentSnapshot('resume', html)}
                />
              </div>
            )}

            {activeTab === 'cover_letter' && (
              <div className="paper-tray">
                <p className="pdf-filename">PDF filename: <span>{buildFilename(result, 'Cover Letter', 'pdf')}</span></p>
                <EditableDocument
                  key={`${activeHistoryId}:cover_letter`} contentId="cover-letter-content" source={result.cover_letter}
                  components={COVER_MARKDOWN_COMPONENTS} label="Cover letter document" isEditing={isEditing}
                  savedHtml={documentSnapshots.current.get(activeHistoryId)?.cover_letter}
                  onSnapshot={(html) => saveDocumentSnapshot('cover_letter', html)}
                />
              </div>
            )}

            {activeTab === 'ats' && result.ats_score && (
              <div className="review-content">
                <p className="estimate-notice">AI estimate of resume fit. Actual screening systems and hiring decisions may differ.</p>
                <div className="score-row"><ScoreRing score={result.ats_score.overall} label="Overall match" size={100} /><ScoreRing score={result.ats_score.keyword_coverage} label="Keyword coverage" size={100} /></div>
                <div className="fit-columns">
                  <section className="fit-card"><h3>Strongest match areas</h3><ul className="fit-list">{result.ats_score.strongest_areas?.map((area, index) => <li key={index}>{area}</li>)}</ul></section>
                  <section className="fit-card"><h3>Gaps to address</h3><ul className="fit-list">{result.ats_score.gaps?.length > 0 ? result.ats_score.gaps.map((gap, index) => <li key={index}>{gap}</li>) : <li>No significant gaps detected</li>}</ul></section>
                </div>
                {result.six_second_test && <section className="recruiter-scan"><h3>6-second recruiter scan</h3><p>{result.six_second_test}</p></section>}
              </div>
            )}

            {activeTab === 'before_after' && result.before_after && (
              <div className="review-content comparisons"><p className="view-description">See how your original experience has been reframed for this role.</p>{result.before_after.map((item, index) => <BeforeAfterCard key={index} item={item} index={index} />)}</div>
            )}

            {activeTab === 'cold_messages' && (
              <div className="review-content message-list">
                <p className="view-description">LinkedIn messages tailored to this role. Replace [Name] with the recipient’s name before sending.</p>
                <ColdMessageCard label="To a recruiter" message={result.cold_messages?.recruiter} subject={result.cold_messages?.subject_lines?.recruiter} />
                <ColdMessageCard label="To a peer" message={result.cold_messages?.designer} subject={result.cold_messages?.subject_lines?.designer} />
              </div>
            )}

            <AnalysisSummary analysis={result.analysis} />
          </section>
        )}

      </main>

      <footer className="site-footer">
        <div className="footer-brand-row"><span>Resume Engine</span><span>Powered by Claude</span></div>
        <PrivacyDisclosure />
      </footer>
    </div>
  );
}
