'use client';

import { useState, useCallback } from 'react';
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

// ─── Main Page ──────────────────────────────────────────────────────
export default function Home() {
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('resume');

  const tabs = [
    { id: 'resume', label: 'Resume' },
    { id: 'cover_letter', label: 'Cover Letter' },
    { id: 'ats', label: 'ATS Score' },
    { id: 'before_after', label: 'Before / After' },
  ];

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[#1A1A1D] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#34D399] to-[#059669] flex items-center justify-center">
              <span className="text-[#0A0A0B] font-bold text-sm">R</span>
            </div>
            <div>
              <h1 className="font-display text-lg text-[#F5F0EB]">Resume Engine</h1>
              <p className="text-[10px] text-[#555] tracking-widest uppercase">Olumide Olusesi</p>
            </div>
          </div>
          {result && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#34D399]" />
              <span className="text-xs text-[#9E9088]">Generated</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
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
                  </>
                )}
              </div>
            </div>

            {/* Tab Content */}

            {/* Resume Tab - A4 Paper */}
            {activeTab === 'resume' && (
              <div className="py-6 flex justify-center">
                <div className="resume-paper" id="resume-content">
                  <ReactMarkdown>{result.resume}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Cover Letter Tab - A4 Paper */}
            {activeTab === 'cover_letter' && (
              <div className="py-6 flex justify-center">
                <div className="resume-paper" id="cover-letter-content">
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
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1A1A1D] mt-12 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-[10px] text-[#555]">Resume Engine v1.0</p>
          <p className="text-[10px] text-[#555]">Built with Claude API · Deployed on Railway</p>
        </div>
      </footer>
    </div>
  );
}
