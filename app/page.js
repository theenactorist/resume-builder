'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

// ─── Icons (inline SVG) ─────────────────────────────────────────────
const Icons = {
  Copy: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  Sparkle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M5.5 7.5 12 3l6.5 4.5M5.5 16.5 12 21l6.5-4.5" />
    </svg>
  ),
  Download: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Arrow: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Sidebar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  ),
};

// ─── Copy Button Component ──────────────────────────────────────────
function CopyButton({ text, contentId, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const el = contentId ? document.getElementById(contentId) : null;
      if (el) {
        const htmlBlob = new Blob([el.innerHTML], { type: 'text/html' });
        const textBlob = new Blob([text], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      await navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text, contentId]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200"
      style={{
        borderColor: copied ? '#34D399' : '#2C2C30',
        color: copied ? '#34D399' : '#9E9088',
        background: copied ? 'rgba(52,211,153,0.08)' : 'transparent',
      }}
    >
      {copied ? <Icons.Check /> : <Icons.Copy />}
      {copied ? 'Copied' : label}
    </button>
  );
}

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

// ─── Export as text file ────────────────────────────────────────────
function ExportButton({ content, filename }) {
  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#2C2C30] text-[#9E9088] hover:border-[#34D399] hover:text-[#34D399] transition-all duration-200"
    >
      <Icons.Download />
      Export .md
    </button>
  );
}

// ─── Export as DOCX ─────────────────────────────────────────────────
function ExportDocxButton({ contentId, filename }) {
  const handleExport = () => {
    const el = document.getElementById(contentId);
    if (!el) return;

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 2.5cm; }
          body { font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.5; color: #222; }
          h1 { font-size: 22pt; font-weight: 700; color: #222; margin: 0 0 4px 0; }
          h2 { font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1.5px solid #4657f1; padding-bottom: 3px; margin-top: 16px; margin-bottom: 8px; color: #4657f1; }
          h3 { font-size: 11pt; font-weight: 600; margin-top: 18px; margin-bottom: 4px; }
          p { margin-bottom: 4px; font-size: 10.5pt; }
          ul { padding-left: 20px; margin-bottom: 6px; }
          li { margin-bottom: 4px; font-size: 10.5pt; }
          a { color: #222; text-decoration: underline; }
        </style>
      </head>
      <body>${el.innerHTML}</body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#2C2C30] text-[#9E9088] hover:border-[#34D399] hover:text-[#34D399] transition-all duration-200"
    >
      <Icons.Download />
      Export .docx
    </button>
  );
}

// ─── Export as PDF ──────────────────────────────────────────────────
function ExportPdfButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#2C2C30] text-[#9E9088] hover:border-[#34D399] hover:text-[#34D399] transition-all duration-200"
    >
      <Icons.Download />
      Export .pdf
    </button>
  );
}

// ─── Tab Component ──────────────────────────────────────────────────
function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-[#111113] border border-[#1A1A1D]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-[#1A1A1D] text-[#34D399] shadow-sm'
              : 'text-[#9E9088] hover:text-[#C4B8AC]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Score Ring ──────────────────────────────────────────────────────
function ScoreRing({ score, label, size = 80 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#34D399' : score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1A1A1D" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="text-center -mt-14">
        <div className="text-2xl font-bold" style={{ color }}>{score}</div>
      </div>
      <div className="text-xs text-[#9E9088] mt-2 text-center">{label}</div>
    </div>
  );
}

// ─── Before/After Card ──────────────────────────────────────────────
function BeforeAfterCard({ item, index }) {
  return (
    <div className="rounded-lg border border-[#1A1A1D] overflow-hidden">
      <div className="px-4 py-2 bg-[#111113] border-b border-[#1A1A1D]">
        <span className="text-xs font-mono text-[#9E9088]">Bullet #{index + 1}</span>
      </div>
      <div className="grid md:grid-cols-2 divide-x divide-[#1A1A1D]">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded">Before</span>
          </div>
          <p className="text-sm text-[#9E9088] leading-relaxed">{item.before}</p>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#34D399] bg-[#34D399]/10 px-2 py-0.5 rounded">After</span>
          </div>
          <p className="text-sm text-[#C4B8AC] leading-relaxed">{item.after}</p>
        </div>
      </div>
      <div className="px-4 py-3 bg-[#0F0F10] border-t border-[#1A1A1D]">
        <p className="text-xs text-[#9E9088]"><span className="text-[#F59E0B] font-medium">Why:</span> {item.why}</p>
      </div>
    </div>
  );
}

// ─── Loading State ──────────────────────────────────────────────────
function LoadingState() {
  const messages = [
    'Extracting keywords from job description',
    'Mapping skills and reordering bullets',
    'Generating targeted resume',
    'Writing cover letter',
    'Running ATS analysis',
  ];
  const [msgIndex, setMsgIndex] = useState(0);

  useState(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  });

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[#34D399] loading-dot" />
        <div className="w-2 h-2 rounded-full bg-[#34D399] loading-dot" />
        <div className="w-2 h-2 rounded-full bg-[#34D399] loading-dot" />
      </div>
      <p className="text-sm text-[#9E9088] animate-pulse">{messages[msgIndex]}...</p>
      <p className="text-xs text-[#555] mt-2">This typically takes 30-45 seconds</p>
    </div>
  );
}

// ─── History Sidebar ────────────────────────────────────────────────
function HistorySidebar({ history, activeId, onSelect, onDelete, onNewGeneration, isOpen }) {
  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="w-72 shrink-0 border-r border-[#1A1A1D] bg-[#0C0C0D] flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#1A1A1D]">
        <button
          onClick={onNewGeneration}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#34D399] text-[#0A0A0B] hover:bg-[#2CC48A] transition-all duration-200"
        >
          <Icons.Plus />
          New Generation
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="p-4 text-center">
            <Icons.Clock />
            <p className="text-xs text-[#555] mt-3">No saved generations yet.</p>
            <p className="text-xs text-[#3a3a3f] mt-1">Generate a resume to see it here.</p>
          </div>
        ) : (
          <div className="py-2">
            {history.map((item) => (
              <div
                key={item.id}
                className={`group relative mx-2 mb-1 rounded-lg cursor-pointer transition-all duration-150 ${
                  activeId === item.id
                    ? 'bg-[#1A1A1D] border border-[#34D399]/30'
                    : 'hover:bg-[#111113] border border-transparent'
                }`}
              >
                <div
                  onClick={() => onSelect(item.id)}
                  className="px-3 py-3 pr-8"
                >
                  <p className={`text-sm font-medium truncate ${
                    activeId === item.id ? 'text-[#34D399]' : 'text-[#C4B8AC]'
                  }`}>
                    {item.company_name}
                  </p>
                  {item.job_title && (
                    <p className="text-xs text-[#555] truncate mt-0.5">{item.job_title}</p>
                  )}
                  <p className="text-[10px] text-[#3a3a3f] mt-1 flex items-center gap-1">
                    <Icons.Clock />
                    {formatDate(item.created_at)}
                  </p>
                </div>
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 p-1 rounded text-[#555] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all duration-150"
                  title="Delete"
                >
                  <Icons.Trash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function Home() {
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('resume');
  const [history, setHistory] = useState([]);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const tabs = [
    { id: 'resume', label: 'Resume' },
    { id: 'cover_letter', label: 'Cover Letter' },
    { id: 'ats', label: 'ATS Score' },
    { id: 'before_after', label: 'Before / After' },
  ];

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const handleSelectHistory = async (id) => {
    try {
      const res = await fetch(`/api/history/${id}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data.result);
        setJobDescription(data.job_description || '');
        setActiveHistoryId(id);
        setActiveTab('resume');
        setError(null);
      }
    } catch (err) {
      console.error('Failed to load generation:', err);
    }
  };

  const handleDeleteHistory = async (id) => {
    try {
      const res = await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
        if (activeHistoryId === id) {
          setResult(null);
          setActiveHistoryId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleNewGeneration = () => {
    setResult(null);
    setActiveHistoryId(null);
    setJobDescription('');
    setError(null);
    setActiveTab('resume');
  };

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveHistoryId(null);
    setActiveTab('resume');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult(data);
      // Refresh history to include the new entry
      await fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1A1A1D] px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md text-[#9E9088] hover:text-[#F5F0EB] hover:bg-[#1A1A1D] transition-all duration-150"
              title={sidebarOpen ? 'Hide history' : 'Show history'}
            >
              <Icons.Sidebar />
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#34D399] to-[#059669] flex items-center justify-center">
              <span className="text-[#0A0A0B] font-bold text-sm">R</span>
            </div>
            <div>
              <h1 className="font-display text-lg text-[#F5F0EB]">Resume Engine</h1>
              <p className="text-[10px] text-[#555] tracking-widest uppercase">Olumide Olusesi</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {result && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#34D399]" />
                <span className="text-xs text-[#9E9088]">Generated</span>
              </div>
            )}
            {history.length > 0 && (
              <span className="text-[10px] text-[#555] font-mono">{history.length} saved</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* History Sidebar */}
        <HistorySidebar
          history={history}
          activeId={activeHistoryId}
          onSelect={handleSelectHistory}
          onDelete={handleDeleteHistory}
          onNewGeneration={handleNewGeneration}
          isOpen={sidebarOpen}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Input Section */}
            <div className="mb-8">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <h2 className="text-sm font-medium text-[#F5F0EB] mb-1">Job Description</h2>
                  <p className="text-xs text-[#555]">
                    Paste the full JD below. The engine will extract keywords, reorder bullets, and generate a targeted resume + cover letter.
                  </p>
                </div>
                <span className="text-xs text-[#555] font-mono tabular-nums">
                  {jobDescription.length > 0 ? `${jobDescription.length} chars` : ''}
                </span>
              </div>

              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the complete job description here..."
                rows={8}
                className="w-full bg-[#111113] border border-[#1A1A1D] rounded-lg px-4 py-3 text-sm text-[#C4B8AC] placeholder-[#3a3a3f] resize-y font-body leading-relaxed transition-all duration-200"
              />

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-[#555]">
                  ~$0.05 per generation · Powered by Claude Sonnet
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={loading || jobDescription.trim().length < 50}
                  className={`btn-generate flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    loading || jobDescription.trim().length < 50
                      ? 'bg-[#1A1A1D] text-[#555] cursor-not-allowed'
                      : 'bg-[#34D399] text-[#0A0A0B] hover:bg-[#2CC48A] hover:shadow-lg hover:shadow-[#34D399]/20'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A0B] loading-dot" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A0B] loading-dot" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A0B] loading-dot" />
                      </div>
                      Generating
                    </>
                  ) : (
                    <>
                      Generate
                      <Icons.Arrow />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5">
                <p className="text-sm text-[#EF4444]">{error}</p>
              </div>
            )}

            {/* Loading */}
            {loading && <LoadingState />}

            {/* Results */}
            {result && !loading && (
              <div>
                {/* Tabs */}
                <div className="flex items-center justify-between mb-6">
                  <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                  <div className="flex gap-2">
                    {(activeTab === 'resume' || activeTab === 'cover_letter') && (
                      <>
                        <CopyButton
                          text={activeTab === 'resume' ? result.resume : result.cover_letter}
                          contentId={activeTab === 'resume' ? 'resume-content' : 'cover-letter-content'}
                          label="Copy"
                        />
                        <ExportButton
                          content={activeTab === 'resume' ? result.resume : result.cover_letter}
                          filename={activeTab === 'resume' ? 'Resume_Olumide_Olusesi.md' : 'Cover_Letter_Olumide_Olusesi.md'}
                        />
                        <ExportDocxButton
                          contentId={activeTab === 'resume' ? 'resume-content' : 'cover-letter-content'}
                          filename={activeTab === 'resume' ? 'Resume_Olumide_Olusesi.docx' : 'Cover_Letter_Olumide_Olusesi.docx'}
                        />
                        <ExportPdfButton />
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 ${
                            isEditing 
                              ? 'border-[#34D399] text-[#34D399] bg-[#34D399]/10' 
                              : 'border-[#2C2C30] text-[#9E9088] hover:border-[#34D399] hover:text-[#34D399]'
                          }`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          {isEditing ? 'Done Editing' : 'Edit Artboard'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Gaps Panel */}
                <GapsPanel gaps={result.gaps} />

                {/* Tab Content */}

                {/* Resume Tab - A4 Paper */}
                {activeTab === 'resume' && (
                  <div className="py-6 flex justify-center">
                    <div 
                      className="resume-paper" 
                      id="resume-content"
                      contentEditable={isEditing}
                      suppressContentEditableWarning={true}
                    >
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => {
                            const childArray = Array.isArray(children) ? children : [children];
                            const fullText = childArray.map(c => (typeof c === 'string' ? c : '')).join('');

                            if (!fullText.includes('|||')) {
                              return <h1>{children}</h1>;
                            }

                            // Split into name (left) and contact items (right) at |||
                            const leftParts = [];
                            const rightRaw = [];
                            let foundDelimiter = false;

                            childArray.forEach((child) => {
                              if (typeof child === 'string' && child.includes('|||')) {
                                const [left, right] = child.split('|||');
                                if (left.trim()) leftParts.push(left.trim());
                                foundDelimiter = true;
                                if (right?.trim()) rightRaw.push(right.trim());
                              } else if (!foundDelimiter) {
                                leftParts.push(child);
                              } else {
                                rightRaw.push(child);
                              }
                            });

                            // Split right side into individual contact lines at ' | '
                            const contactLines = [];
                            let currentLine = [];
                            rightRaw.forEach((part) => {
                              if (typeof part === 'string') {
                                const segments = part.split(' | ');
                                segments.forEach((seg, i) => {
                                  if (i > 0) {
                                    if (currentLine.length) contactLines.push(currentLine);
                                    currentLine = [];
                                  }
                                  if (seg.trim()) currentLine.push(seg.trim());
                                });
                              } else {
                                currentLine.push(part);
                              }
                            });
                            if (currentLine.length) contactLines.push(currentLine);

                            return (
                              <div className="resume-header">
                                <div className="resume-header-left">
                                  <h1>{leftParts}</h1>
                                </div>
                                <div className="resume-header-right">
                                  {contactLines.map((line, i) => (
                                    <div key={i}>{line}</div>
                                  ))}
                                </div>
                              </div>
                            );
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
                        }}
                      >{result.resume}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Cover Letter Tab - A4 Paper */}
                {activeTab === 'cover_letter' && (
                  <div className="py-6 flex justify-center">
                    <div 
                      className="resume-paper" 
                      id="cover-letter-content"
                      contentEditable={isEditing}
                      suppressContentEditableWarning={true}
                    >
                      <ReactMarkdown>{result.cover_letter}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* ATS & Before/After - Dark Panel */}
                {(activeTab === 'ats' || activeTab === 'before_after') && (
                <div className="rounded-xl border border-[#1A1A1D] bg-[#0F0F10] min-h-[400px]">
                  {/* ATS Score Tab */}
                  {activeTab === 'ats' && result.ats_score && (
                    <div className="p-6 md:p-8">
                      <div className="flex flex-wrap gap-8 justify-center mb-10 pt-4">
                        <ScoreRing score={result.ats_score.overall} label="Overall Match" size={100} />
                        <ScoreRing score={result.ats_score.keyword_coverage} label="Keyword Coverage" size={100} />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="rounded-lg border border-[#1A1A1D] p-5">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-[#34D399] mb-3">Strongest Match Areas</h3>
                          <ul className="space-y-2">
                            {result.ats_score.strongest_areas?.map((area, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-[#C4B8AC]">
                                <span className="text-[#34D399] mt-0.5">✓</span>
                                {area}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-lg border border-[#1A1A1D] p-5">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-3">Gaps to Address</h3>
                          <ul className="space-y-2">
                            {result.ats_score.gaps?.length > 0 ? (
                              result.ats_score.gaps.map((gap, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-[#C4B8AC]">
                                  <span className="text-[#F59E0B] mt-0.5">△</span>
                                  {gap}
                                </li>
                              ))
                            ) : (
                              <li className="text-sm text-[#9E9088]">No significant gaps detected</li>
                            )}
                          </ul>
                        </div>
                      </div>

                      {/* 6-Second Scan Test */}
                      {result.six_second_test && (
                        <div className="mt-6 rounded-lg border border-[#1A1A1D] p-5 bg-[#111113]">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-[#C4B8AC] mb-2">6-Second Scan Test</h3>
                          <p className="text-sm text-[#9E9088] leading-relaxed">{result.six_second_test}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Before/After Tab */}
                  {activeTab === 'before_after' && result.before_after && (
                    <div className="p-6 md:p-8 space-y-4">
                      <p className="text-xs text-[#555] mb-4">
                        The 3 weakest bullets from your base resume, shown alongside their optimized versions.
                      </p>
                      {result.before_after.map((item, i) => (
                        <BeforeAfterCard key={i} item={item} index={i} />
                      ))}
                    </div>
                  )}
                </div>
                )}

                {/* Analysis Summary */}
                {result.analysis && (
                  <div className="mt-6 rounded-xl border border-[#1A1A1D] bg-[#0F0F10] p-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#9E9088] mb-4">JD Analysis</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Hard Skills Extracted</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {result.analysis.hard_skills?.map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Soft Skills Extracted</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {result.analysis.soft_skills?.map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Keyword Map</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {result.analysis.keyword_map?.slice(0, 12).map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded bg-[#1A1A1D] text-[#9E9088] border border-[#2C2C30]">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!result && !loading && !error && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#111113] border border-[#1A1A1D] flex items-center justify-center mb-6">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="font-display text-lg text-[#F5F0EB] mb-2">Paste a job description to get started</h3>
                <p className="text-sm text-[#555] max-w-md">
                  The engine will analyze the JD, extract keywords, reorder your bullets by relevance, generate a targeted resume and cover letter, and score your ATS match.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1A1A1D] mt-auto px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#555]">Resume Engine v1.0</p>
          <p className="text-[10px] text-[#555]">Built with Claude API · Deployed on Railway</p>
        </div>
      </footer>
    </div>
  );
}
