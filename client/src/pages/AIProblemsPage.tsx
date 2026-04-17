import { useState, useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeEditor from '../components/CodeEditor';
import {
  generateProblems, getProposals, acceptProposal, hideProposal,
  hidePendingProposals, getLastInput, gradeCode, getGenerationCache, clearGenerationCache,
  AIProposal, AIInput, GeneratePayload, Example, GenerationSummary,
} from '../api';

// ─── TagInput ────────────────────────────────────────────────────────────────

function TagInput({
  tags, onChange, placeholder,
}: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');

  const addTags = (raw: string) => {
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    const next = [...tags];
    for (const p of parts) {
      if (!next.includes(p)) next.push(p);
    }
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) { addTags(input); setInput(''); }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div
      className="flex flex-wrap gap-2 p-2 rounded-lg min-h-[38px] items-center cursor-text"
      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
      onClick={e => { const inp = (e.currentTarget as HTMLDivElement).querySelector('input'); inp?.focus(); }}
    >
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-accent)', color: 'var(--color-text-primary)' }}>
          {t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="hover:opacity-70 font-bold leading-none">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) { addTags(input); setInput(''); } }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
        style={{ color: 'var(--color-text-primary)' }}
      />
    </div>
  );
}

// ─── DifficultyBadge ─────────────────────────────────────────────────────────

function DifficultyBadge({ d }: { d: string }) {
  const cls = d === 'Easy' ? 'badge-easy' : d === 'Medium' ? 'badge-medium' : 'badge-hard';
  return <span className={cls}>{d}</span>;
}

// ─── ToggleGroup ─────────────────────────────────────────────────────────────

function ToggleGroup<T extends string>({
  options, value, onChange,
}: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      {options.map((opt, i) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="px-4 py-2 text-sm font-medium transition-colors"
          style={{
            background: value === opt ? 'var(--color-accent)' : 'transparent',
            color: value === opt ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            borderLeft: i > 0 ? '1px solid var(--color-border)' : undefined,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── DEFAULT CODE ─────────────────────────────────────────────────────────────

const DEFAULT_CODE: Record<string, string> = {
  javascript: `function solution(...args) {\n  // your code here\n}`,
  python: `def solution(*args):\n    # your code here\n    pass`,
  java: `public class Solution {\n    public Object solution(Object... args) {\n        // your code here\n        return null;\n    }\n}`,
  sql: `-- Write your SQL query here\nSELECT `,
  text: ``,
};

// ─── ProposalModal ────────────────────────────────────────────────────────────

function ProposalModal({ proposal, onClose }: { proposal: AIProposal; onClose: () => void }) {
  const [language, setLanguage] = useState(proposal.language || 'javascript');
  const [code, setCode] = useState(DEFAULT_CODE[proposal.language] ?? DEFAULT_CODE.javascript);
  const [rightTab, setRightTab] = useState<'editor' | 'answer' | 'ai'>('editor');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang] ?? '');
  };

  const handleSubmit = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError('');
    setRightTab('ai');
    try {
      const res = await gradeCode({
        problemTitle: proposal.title,
        description: proposal.description,
        examples: (proposal.examples ?? []) as Example[],
        solution: proposal.solution ?? null,
        userCode: code,
        language,
      });
      setAiFeedback(res.feedback);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setAiError(msg || 'Failed to get AI feedback.');
    } finally {
      setAiLoading(false);
    }
  }, [proposal, code, language, aiLoading]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: 'rgba(44,44,42,0.6)' }}
    >
      <div
        className="flex flex-1 m-4 rounded-xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left panel */}
        <div className="w-[45%] min-w-[340px] flex flex-col overflow-hidden" style={{ borderRight: '1px solid var(--color-border)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <DifficultyBadge d={proposal.difficulty} />
              {proposal.category && (
                <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: proposal.category_color ?? 'var(--color-accent)', color: 'var(--color-text-primary)' }}>
                  {proposal.category}
                </span>
              )}
              {proposal.tags.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{t}</span>
              ))}
            </div>
            <button onClick={onClose} className="text-xs px-3 py-1 rounded-lg" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
              ✕ Close
            </button>
          </div>
          <div className="px-5 pt-3 pb-1" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{proposal.title}</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-content">{proposal.description}</ReactMarkdown>
            {proposal.examples && (proposal.examples as Example[]).length > 0 && (
              <>
                <h3 className="text-sm font-semibold mt-5 mb-2" style={{ color: 'var(--color-text-primary)' }}>Examples</h3>
                <div className="space-y-3">
                  {(proposal.examples as Example[]).map((ex, i) => (
                    <div key={i} className="rounded-lg p-3 text-sm font-mono" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                      <div><span style={{ color: 'var(--color-text-muted)' }}>Input:  </span><span style={{ color: 'var(--color-text-primary)' }}>{ex.input}</span></div>
                      <div><span style={{ color: 'var(--color-text-muted)' }}>Output: </span><span style={{ color: 'var(--color-text-primary)' }}>{ex.output}</span></div>
                      {ex.explanation && <div className="mt-1" style={{ color: 'var(--color-text-secondary)' }}><span style={{ color: 'var(--color-text-muted)' }}>Explanation: </span>{ex.explanation}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}
            {proposal.constraints && (
              <>
                <h3 className="text-sm font-semibold mt-5 mb-2" style={{ color: 'var(--color-text-primary)' }}>Constraints</h3>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-content">{proposal.constraints}</ReactMarkdown>
              </>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex rounded-lg overflow-hidden text-xs font-medium" style={{ border: '1px solid var(--color-border)' }}>
              {(['editor', 'answer', 'ai'] as const).map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className="px-4 py-1.5 transition-colors"
                  style={{
                    background: rightTab === tab ? 'var(--color-accent)' : 'transparent',
                    color: rightTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    borderLeft: i > 0 ? '1px solid var(--color-border)' : undefined,
                  }}
                >
                  {tab === 'editor' ? 'Editor' : tab === 'answer' ? 'Answer' : 'AI Grading'}
                </button>
              ))}
            </div>
            {rightTab === 'editor' && (
              <div className="flex items-center gap-3">
                <select value={language} onChange={e => handleLanguageChange(e.target.value)} className="input-base w-36" style={{ padding: '4px 10px' }}>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="sql">SQL</option>
                  <option value="text">Text</option>
                </select>
                <button onClick={handleSubmit} disabled={aiLoading} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                  {aiLoading ? 'Grading…' : '▶ Submit'}
                </button>
              </div>
            )}
          </div>

          {/* Editor */}
          {rightTab === 'editor' && (
            <div className="flex-1 overflow-hidden">
              <CodeEditor language={language} value={code} onChange={v => setCode(v ?? '')} />
            </div>
          )}

          {/* Answer */}
          {rightTab === 'answer' && (
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {proposal.solution && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Solution Code</p>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-content mb-6">{proposal.solution}</ReactMarkdown>
                </>
              )}
              {proposal.solution_explanation && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Explanation</p>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-content">{proposal.solution_explanation}</ReactMarkdown>
                </>
              )}
              {!proposal.solution && !proposal.solution_explanation && (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No solution provided.</p>
              )}
            </div>
          )}

          {/* AI Grading */}
          {rightTab === 'ai' && (
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {aiLoading && (
                <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--color-text-muted)' }}>
                  <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-accent-hover)', borderTopColor: 'transparent' }} />
                  <span className="text-sm">AI is reviewing your code…</span>
                </div>
              )}
              {!aiLoading && aiError && (
                <div className="rounded-lg p-4 text-sm" style={{ background: '#F8E0DC', color: '#7A200E', border: '1px solid #E8B0A0' }}>{aiError}</div>
              )}
              {!aiLoading && !aiError && aiFeedback && (
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-content">{aiFeedback}</ReactMarkdown>
              )}
              {!aiLoading && !aiError && !aiFeedback && (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Submit your code to get AI feedback.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ProposalCard ─────────────────────────────────────────────────────────────

function ProposalCard({
  proposal, onView, onAccept, onHide,
}: {
  proposal: AIProposal;
  onView: () => void;
  onAccept: () => void;
  onHide: () => void;
}) {
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(proposal.status === 'accepted');
  const [hiding, setHiding] = useState(false);
  const [hidden, setHidden] = useState(false);

  const handleAccept = async () => {
    if (accepting || accepted) return;
    setAccepting(true);
    try { await onAccept(); setAccepted(true); } finally { setAccepting(false); }
  };

  const handleHide = async () => {
    if (hiding) return;
    setHiding(true);
    try { await onHide(); setHidden(true); } finally { setHiding(false); }
  };

  if (hidden) return null;

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{proposal.title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge d={proposal.difficulty} />
            {proposal.category && (
              <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: proposal.category_color ?? 'var(--color-accent)', color: 'var(--color-text-primary)' }}>
                {proposal.category}
              </span>
            )}
            {proposal.tags.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{t}</span>
            ))}
          </div>
        </div>
        {accepted && (
          <span className="text-xs font-medium px-2 py-1 rounded-lg flex-shrink-0" style={{ background: '#D4EDDA', color: '#155724', border: '1px solid #C3E6CB' }}>
            Added ✅
          </span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={onView} className="btn-secondary text-xs px-3 py-1.5">View & Practice</button>
        {!accepted && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-accent)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
          >
            {accepting ? 'Adding…' : '✅ Add to Library'}
          </button>
        )}
        <button
          onClick={handleHide}
          disabled={hiding}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{ background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
        >
          {hiding ? '…' : '✕ Dismiss'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type View = 'form' | 'proposals';

export default function AIProblemsPage() {
  // View state
  const [view, setView] = useState<View>('form');

  // Form fields
  const [topics, setTopics] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [goal, setGoal] = useState<'job' | 'learning'>('learning');
  const [jobRoles, setJobRoles] = useState<string[]>([]);
  const [jobLevel, setJobLevel] = useState<'Junior' | 'Intermediate' | 'Senior'>('Junior');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [skillLevel, setSkillLevel] = useState(5);
  const [extraNotes, setExtraNotes] = useState('');
  const [refinementNote, setRefinementNote] = useState('');
  const [isRefinement, setIsRefinement] = useState(false);

  // Proposals
  const [proposals, setProposals] = useState<AIProposal[]>([]);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generationSummary, setGenerationSummary] = useState<GenerationSummary | null>(null);

  // Field-level validation errors
  const [topicsError, setTopicsError] = useState('');
  const [languagesError, setLanguagesError] = useState('');
  const [jobRolesError, setJobRolesError] = useState('');
  const [extraNotesError, setExtraNotesError] = useState('');
  const [refinementNoteError, setRefinementNoteError] = useState('');

  // Last input (for "Continue from last session")
  const [lastInput, setLastInput] = useState<AIInput | null>(null);
  const [lastInputLoaded, setLastInputLoaded] = useState(false);
  const [showContinueBanner, setShowContinueBanner] = useState(false);

  // Proposal detail modal
  const [selectedProposal, setSelectedProposal] = useState<AIProposal | null>(null);

  // Exit modal (navigation blocker)
  const [showExitModal, setShowExitModal] = useState(false);

  // Cache panel
  const [showCachePanel, setShowCachePanel] = useState(false);
  const [cacheRows, setCacheRows] = useState<Array<{ category_id: number | null; category_name: string | null; hidden_count: number }>>([]);

  // Pending count (for beforeunload warning)
  const pendingCount = proposals.filter(p => p.status === 'pending').length;

  // Warn on tab close / refresh if there are pending proposals
  useEffect(() => {
    if (pendingCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pendingCount]);

  // Block in-app navigation when there are pending proposals
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      pendingCount > 0 && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowExitModal(true);
    }
  }, [blocker.state]);

  // Load last input on mount
  useEffect(() => {
    getLastInput()
      .then(data => {
        setLastInput(data);
        setShowContinueBanner(data !== null);
      })
      .catch(() => {})
      .finally(() => setLastInputLoaded(true));
  }, []);

  // Load existing pending proposals on mount
  useEffect(() => {
    getProposals()
      .then(data => {
        if (data.length > 0) {
          setProposals(data);
          setView('proposals');
        }
      })
      .catch(() => {});
  }, []);

  const fillFromLastInput = (input: AIInput) => {
    setTopics(input.topics);
    setLanguages(input.languages);
    setGoal(input.goal);
    setJobRoles(input.job_roles ?? []);
    setJobLevel((input.job_level as 'Junior' | 'Intermediate' | 'Senior') ?? 'Junior');
    setDifficulty((input.difficulty as 'Easy' | 'Medium' | 'Hard') ?? 'Medium');
    setSkillLevel(input.skill_level);
    setExtraNotes(input.extra_notes ?? '');
  };

  const handleContinue = () => {
    if (lastInput) fillFromLastInput(lastInput);
    setShowContinueBanner(false);
  };

  const handleStartFresh = () => {
    setTopics([]); setLanguages([]); setGoal('learning'); setJobRoles([]);
    setJobLevel('Junior'); setDifficulty('Medium'); setSkillLevel(5); setExtraNotes('');
    setRefinementNote(''); setIsRefinement(false);
    setShowContinueBanner(false);
  };

  const validateInputs = (): boolean => {
    const isInvalidTag = (tag: string) =>
      /^\d+$/.test(tag) || /^[^a-zA-Z0-9\u4e00-\u9fff]+$/.test(tag);
    let valid = true;

    const badTopic = topics.find(isInvalidTag);
    if (badTopic) { setTopicsError('Tags cannot be purely numeric or symbolic.'); valid = false; }
    else setTopicsError('');

    const badLang = languages.find(isInvalidTag);
    if (badLang) { setLanguagesError('Tags cannot be purely numeric or symbolic.'); valid = false; }
    else setLanguagesError('');

    if (goal === 'job') {
      const badRole = jobRoles.find(isInvalidTag);
      if (badRole) { setJobRolesError('Tags cannot be purely numeric or symbolic.'); valid = false; }
      else setJobRolesError('');
    } else {
      setJobRolesError('');
    }

    if (extraNotes.length > 300) { setExtraNotesError('Maximum 300 characters.'); valid = false; }
    else setExtraNotesError('');

    if (refinementNote.length > 300) { setRefinementNoteError('Maximum 300 characters.'); valid = false; }
    else setRefinementNoteError('');

    return valid;
  };

  const handleGenerate = async () => {
    if (!topics.length) { setGenerateError('Please add at least one topic.'); return; }
    if (!validateInputs()) return;
    setGenerating(true);
    setGenerateError('');
    try {
      const payload: GeneratePayload = {
        topics, languages, goal, skillLevel,
        extraNotes: extraNotes || undefined,
        refinementNote: refinementNote || undefined,
      };
      if (goal === 'job') {
        payload.jobRoles = jobRoles;
        payload.jobLevel = jobLevel;
      } else {
        payload.difficulty = difficulty;
      }
      const { proposals: newProposals, generationSummary: summary } = await generateProblems(payload);
      setProposals(prev => [...newProposals, ...prev]);
      setGenerationSummary(summary);
      setRefinementNote('');
      // Refresh lastInput so the refinement screen reflects the latest session
      getLastInput().then(data => { if (data) setLastInput(data); }).catch(() => {});
      setView('proposals');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      const errCode = axiosErr?.response?.data?.error;
      const errMsg = axiosErr?.response?.data?.message;
      if (errCode === 'INVALID_INPUT' || errCode === 'INJECTION_DETECTED') {
        setGenerateError(errMsg ?? 'Invalid input. Please revise your request.');
      } else {
        setGenerateError('Failed to generate problems. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateMore = () => {
    if (lastInput) fillFromLastInput(lastInput);
    setIsRefinement(true);
    setRefinementNote('');
    setView('form');
  };

  const handleDismissAll = async () => {
    try {
      await hidePendingProposals();
      setProposals(prev => prev.map(p =>
        p.status === 'pending' ? { ...p, status: 'hidden' as const } : p
      ));
    } catch {
      // silent fail
    }
  };

  const loadCache = async () => {
    const rows = await getGenerationCache().catch(() => []);
    setCacheRows(rows);
  };

  const clearCacheByCategory = async (categoryId?: number) => {
    await clearGenerationCache(categoryId).catch(() => {});
    await loadCache();
  };

  const clearAllCache = async () => {
    await clearGenerationCache().catch(() => {});
    await loadCache();
  };

  // Load cache when panel opens
  useEffect(() => {
    if (showCachePanel) loadCache();
  }, [showCachePanel]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAcceptProposal = async (proposal: AIProposal) => {
    await acceptProposal(proposal.id);
    setProposals(prev => prev.map(p => p.id === proposal.id ? { ...p, status: 'accepted' as const } : p));
  };

  const handleHideProposal = async (proposal: AIProposal) => {
    await hideProposal(proposal.id);
    setProposals(prev => prev.filter(p => p.id !== proposal.id));
  };

  const skillLabelText = skillLevel <= 3 ? 'Beginner' : skillLevel <= 6 ? 'Intermediate' : 'Advanced';

  const LABEL = { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6, display: 'block' as const };
  const SECTION = { borderBottom: '1px solid var(--color-border)', paddingBottom: 24, marginBottom: 24 };

  if (!lastInputLoaded) {
    return <div className="flex items-center justify-center h-64" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>;
  }

  // ─── Proposals View ──────────────────────────────────────────────────────────
  if (view === 'proposals') {
    const visibleProposals = proposals.filter(p => p.status === 'pending');
    const pendingVisible = visibleProposals.filter(p => p.status === 'pending').length;

    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>AI Generated Problems</h1>
            {pendingVisible > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--color-accent)', color: 'var(--color-text-primary)' }}>
                {pendingVisible} pending
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setView('form')} className="btn-secondary text-xs px-3 py-1.5">← Back to Form</button>
            <button
              onClick={handleGenerateMore}
              className="btn-primary text-xs px-3 py-1.5"
            >
              ＋ Generate More
            </button>
            <button
              onClick={handleDismissAll}
              className="btn-secondary text-xs px-3 py-1.5"
              disabled={pendingCount === 0}
            >
              Dismiss All
            </button>
            <button
              onClick={() => setShowCachePanel(v => !v)}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              {showCachePanel ? 'Hide Cache' : 'Manage Cache'}
            </button>
          </div>
        </div>

        {/* Generation summary card */}
        {generationSummary && (
          <div className="rounded-xl px-5 py-4 mb-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-accent-hover)', letterSpacing: '0.05em' }}>✨ WHY THESE PROBLEMS?</p>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>{generationSummary.reasoning}</p>
            {generationSummary.coverage.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Topics covered:</span>
                {generationSummary.coverage.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-accent)', color: 'var(--color-text-primary)' }}>{tag}</span>
                ))}
              </div>
            )}
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{generationSummary.goal_note}</p>
          </div>
        )}

        {/* Cache panel */}
        {showCachePanel && (
          <div className="mb-4 rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Generation Cache</span>
              <button onClick={clearAllCache} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Clear All</button>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Hidden problems are kept to prevent duplicate generation. Clear a category to allow fresh problems of that type.
            </p>
            {cacheRows.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No hidden problems in cache.</p>
            )}
            {cacheRows.map(row => (
              <div key={row.category_id ?? 'null'} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {row.category_name ?? 'Uncategorized'}
                  <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{row.hidden_count} hidden</span>
                </span>
                <button
                  onClick={() => clearCacheByCategory(row.category_id ?? undefined)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                >
                  Clear
                </button>
              </div>
            ))}
          </div>
        )}

        {visibleProposals.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
            <p className="text-sm mb-4">No proposals yet.</p>
            <button onClick={() => setView('form')} className="btn-primary text-sm px-4 py-2">← Back to Form</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visibleProposals.map(p => (
              <ProposalCard
                key={p.id}
                proposal={p}
                onView={() => setSelectedProposal(p)}
                onAccept={() => handleAcceptProposal(p)}
                onHide={() => handleHideProposal(p)}
              />
            ))}
          </div>
        )}

        {/* Proposal detail modal */}
        {selectedProposal && (
          <ProposalModal proposal={selectedProposal} onClose={() => setSelectedProposal(null)} />
        )}

        {/* Exit modal */}
        {showExitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="rounded-xl p-6 max-w-sm w-full mx-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Leave AI Problems?</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                You have {pendingCount} unsaved generated problem{pendingCount > 1 ? 's' : ''}. They\'ll be hidden from view but kept for future generation context.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  className="btn-secondary text-sm px-4 py-2"
                  onClick={() => { setShowExitModal(false); blocker.reset?.(); }}
                >
                  Stay
                </button>
                <button
                  className="btn-primary text-sm px-4 py-2"
                  onClick={async () => {
                    await hidePendingProposals().catch(() => {});
                    setShowExitModal(false);
                    blocker.proceed?.();
                  }}
                >
                  Exit & Hide
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Refinement View ─────────────────────────────────────────────────────────
  if (view === 'form' && isRefinement) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="rounded-2xl p-8" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-accent-hover)', letterSpacing: '0.05em' }}>✨ REFINING LAST SESSION</p>
              <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Generate More Problems</h1>
            </div>
            <button onClick={() => setView('proposals')} className="btn-secondary text-xs px-3 py-1.5">← Back to Proposals</button>
          </div>

          {/* Session summary */}
          {lastInput && (
            <div className="rounded-xl px-4 py-3 mb-6" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>LAST SESSION</p>
              <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <span><span style={{ color: 'var(--color-text-muted)' }}>Topics: </span>{lastInput.topics.join(', ')}</span>
                {lastInput.languages.length > 0 && <span><span style={{ color: 'var(--color-text-muted)' }}>Languages: </span>{lastInput.languages.join(', ')}</span>}
                <span><span style={{ color: 'var(--color-text-muted)' }}>Goal: </span>{lastInput.goal === 'job' ? 'Job Interview' : 'Learning'}</span>
                <span><span style={{ color: 'var(--color-text-muted)' }}>Skill: </span>{lastInput.skill_level}/10</span>
              </div>
            </div>
          )}

          {/* Refinement note */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              What should be different this time? <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span>
            </label>
            <textarea
              value={refinementNote}
              onChange={e => { setRefinementNote(e.target.value); setRefinementNoteError(''); }}
              rows={3}
              placeholder="e.g. 'Make the next problems harder', 'Focus more on edge cases', 'Avoid recursion'"
              className="w-full rounded-lg p-3 text-sm resize-none outline-none"
              style={{ background: 'var(--color-bg)', border: `1px solid ${refinementNoteError ? '#ef4444' : 'var(--color-border)'}`, color: 'var(--color-text-primary)' }}
            />
            <div className="flex justify-between mt-1">
              {refinementNoteError
                ? <span className="text-xs" style={{ color: '#ef4444' }}>{refinementNoteError}</span>
                : <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Leave empty to generate 3 more problems with the same settings.</p>
              }
              <span className="text-xs" style={{ color: refinementNote.length > 280 ? '#ef4444' : 'var(--color-text-muted)' }}>{refinementNote.length} / 300</span>
            </div>
          </div>

          {/* Error */}
          {generateError && (
            <div className="rounded-lg p-3 mb-4 text-sm" style={{ background: '#F8E0DC', color: '#7A200E', border: '1px solid #E8B0A0' }}>
              {generateError}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            style={{ background: 'var(--color-accent-hover)', color: 'var(--color-text-primary)', border: 'none' }}
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 animate-spin inline-block" style={{ borderColor: 'var(--color-text-primary)', borderTopColor: 'transparent' }} />
                AI is crafting your problems…
              </span>
            ) : '✨ Generate 3 More Problems'}
          </button>

          {/* Switch to full form */}
          <button
            onClick={() => { setIsRefinement(false); setRefinementNote(''); }}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          >
            🔧 Switch to Full Form — change topics, difficulty, etc.
          </button>
        </div>

        {/* Exit modal */}
        {showExitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="rounded-xl p-6 max-w-sm w-full mx-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Leave AI Problems?</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                You have {pendingCount} unsaved generated problem{pendingCount > 1 ? 's' : ''}. They\'ll be hidden from view but kept for future generation context.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  className="btn-secondary text-sm px-4 py-2"
                  onClick={() => { setShowExitModal(false); blocker.reset?.(); }}
                >
                  Stay
                </button>
                <button
                  className="btn-primary text-sm px-4 py-2"
                  onClick={async () => {
                    await hidePendingProposals().catch(() => {});
                    setShowExitModal(false);
                    blocker.proceed?.();
                  }}
                >
                  Exit & Hide
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Form View ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="rounded-2xl p-8" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h1 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>✨ AI Problem Generator</h1>

        {/* Continue banner */}
        {showContinueBanner && lastInput && (
          <div className="rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-4" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Continue from last session? <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>({lastInput.topics.join(', ')})</span>
            </span>
            <div className="flex gap-2">
              <button onClick={handleContinue} className="btn-primary text-xs px-3 py-1">Continue</button>
              <button onClick={handleStartFresh} className="btn-secondary text-xs px-3 py-1">Start Fresh</button>
            </div>
          </div>
        )}

        {/* 1. Topics */}
        <div style={SECTION}>
          <label style={LABEL}>Topics <span style={{ color: '#C0392B', fontWeight: 700 }}>*</span></label>
          <TagInput tags={topics} onChange={tags => { setTopics(tags); setTopicsError(''); }} placeholder="e.g. Algorithms, Tree, Dynamic Programming — press Enter to add" />
          {topicsError && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{topicsError}</p>}
        </div>

        {/* 2. Programming Language */}
        <div style={SECTION}>
          <label style={LABEL}>Programming Language <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
          <TagInput tags={languages} onChange={tags => { setLanguages(tags); setLanguagesError(''); }} placeholder="e.g. Python, SQL — leave empty to auto-detect" />
          {languagesError && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{languagesError}</p>}
        </div>

        {/* 3. Goal */}
        <div style={SECTION}>
          <label style={LABEL}>Goal <span style={{ color: '#C0392B', fontWeight: 700 }}>*</span></label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setGoal('job')}
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: goal === 'job' ? 'var(--color-accent)' : 'var(--color-bg)',
                color: 'var(--color-text-primary)',
                border: `2px solid ${goal === 'job' ? 'var(--color-accent-hover)' : 'var(--color-border)'}`,
              }}
            >
              🎯 Job Interview
            </button>
            <button
              type="button"
              onClick={() => setGoal('learning')}
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: goal === 'learning' ? 'var(--color-accent)' : 'var(--color-bg)',
                color: 'var(--color-text-primary)',
                border: `2px solid ${goal === 'learning' ? 'var(--color-accent-hover)' : 'var(--color-border)'}`,
              }}
            >
              📚 Learning
            </button>
          </div>
        </div>

        {/* 4. Goal-specific options */}
        {goal === 'job' && (
          <div style={SECTION}>
            <div className="mb-4">
              <label style={LABEL}>Target Role(s)</label>
              <TagInput tags={jobRoles} onChange={tags => { setJobRoles(tags); setJobRolesError(''); }} placeholder="e.g. SWE, MLE, Data Analyst" />
              {jobRolesError && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{jobRolesError}</p>}
            </div>
            <div>
              <label style={LABEL}>Seniority Level</label>
              <ToggleGroup options={['Junior', 'Intermediate', 'Senior']} value={jobLevel} onChange={setJobLevel} />
            </div>
          </div>
        )}
        {goal === 'learning' && (
          <div style={SECTION}>
            <label style={LABEL}>Difficulty</label>
            <ToggleGroup options={['Easy', 'Medium', 'Hard']} value={difficulty} onChange={setDifficulty} />
          </div>
        )}

        {/* 5. Skill Level */}
        <div style={SECTION}>
          <div className="flex items-center justify-between mb-2">
            <label style={{ ...LABEL, marginBottom: 0 }}>Skill Level <span style={{ color: '#C0392B', fontWeight: 700 }}>*</span></label>
            <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--color-accent)', color: 'var(--color-text-primary)' }}>
              {skillLevel}/10
            </span>
          </div>
          <input
            type="range"
            min={1} max={10}
            value={skillLevel}
            onChange={e => setSkillLevel(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>1 — Beginner</span>
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{skillLabelText}</span>
            <span>10 — Advanced</span>
          </div>
        </div>

        {/* 6. Additional Notes */}
        <div className="mb-6">
          <label style={LABEL}>Additional Notes <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
          <textarea
            value={extraNotes}
            onChange={e => { setExtraNotes(e.target.value); setExtraNotesError(''); }}
            rows={3}
            placeholder="Any extra requirements for the AI, e.g. 'Focus on recursive solutions' or 'No built-in sort functions'"
            className="w-full rounded-lg p-3 text-sm resize-none outline-none"
            style={{ background: 'var(--color-bg)', border: `1px solid ${extraNotesError ? '#ef4444' : 'var(--color-border)'}`, color: 'var(--color-text-primary)' }}
          />
          <div className="flex justify-between mt-1">
            {extraNotesError ? <span className="text-xs" style={{ color: '#ef4444' }}>{extraNotesError}</span> : <span />}
            <span className="text-xs" style={{ color: extraNotes.length > 280 ? '#ef4444' : 'var(--color-text-muted)' }}>{extraNotes.length} / 300</span>
          </div>
        </div>

        {/* Error */}
        {generateError && (
          <div className="rounded-lg p-3 mb-4 text-sm" style={{ background: '#F8E0DC', color: '#7A200E', border: '1px solid #E8B0A0' }}>
            {generateError}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || topics.length === 0}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--color-accent-hover)', color: 'var(--color-text-primary)', border: 'none' }}
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 animate-spin inline-block" style={{ borderColor: 'var(--color-text-primary)', borderTopColor: 'transparent' }} />
              AI is crafting your problems…
            </span>
          ) : '✨ Generate 3 Problems'}
        </button>

        {/* Link to existing proposals */}
        {proposals.length > 0 && (
          <button onClick={() => setView('proposals')} className="w-full mt-3 text-xs text-center" style={{ color: 'var(--color-text-muted)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            View {proposals.filter(p => p.status === 'pending').length} existing proposal(s)
          </button>
        )}
      </div>

      {/* Exit modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl p-6 max-w-sm w-full mx-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Leave AI Problems?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              You have {pendingCount} unsaved generated problem{pendingCount > 1 ? 's' : ''}. They'll be hidden from view but kept for future generation context.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="btn-secondary text-sm px-4 py-2"
                onClick={() => { setShowExitModal(false); blocker.reset?.(); }}
              >
                Stay
              </button>
              <button
                className="btn-primary text-sm px-4 py-2"
                onClick={async () => {
                  await hidePendingProposals().catch(() => {});
                  setShowExitModal(false);
                  blocker.proceed?.();
                }}
              >
                Exit & Hide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
