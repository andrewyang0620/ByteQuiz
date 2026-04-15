import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getProblem, getProblems, runCode, deleteProblem, incrementPracticeCount, gradeCode, ProblemDetail, ExecuteResult, Example } from '../api';
import CodeEditor from '../components/CodeEditor';
import ResultPanel from '../components/ResultPanel';

const DEFAULT_CODE: Record<string, string> = {
  javascript: `function solution(...args) {
  // your code here
}`,
  python: `def solution(*args):
    # your code here
    pass`,
  java: `public class Solution {
    public Object solution(Object... args) {
        // your code here
        return null;
    }
}`,
  sql: `-- Write your SQL query here\nSELECT `,
  text: ``,
};

// Auto-select language based on problem category
const LANGUAGE_MAP: Record<string, string> = {
  SQL: 'sql',
  '八股文': 'text',
  '系统设计': 'text',
  '网络': 'text',
  '操作系统': 'text',
};

function DifficultyBadge({ d }: { d: string }) {
  const cls = d === 'Easy' ? 'badge-easy' : d === 'Medium' ? 'badge-medium' : 'badge-hard';
  return <span className={cls}>{d}</span>;
}

function ExamplesBlock({ examples }: { examples: Example[] }) {
  return (
    <div className="space-y-3 mt-4">
      {examples.map((ex, i) => (
        <div key={i} className="rounded-lg p-3 text-sm font-mono" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div><span style={{ color: 'var(--color-text-muted)' }}>Input:  </span><span style={{ color: 'var(--color-text-primary)' }}>{ex.input}</span></div>
          <div><span style={{ color: 'var(--color-text-muted)' }}>Output: </span><span style={{ color: 'var(--color-text-primary)' }}>{ex.output}</span></div>
          {ex.explanation && (
            <div className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Explanation: </span>{ex.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [practiceCount, setPracticeCount] = useState(0);
  const [incrementing, setIncrementing] = useState(false);
  const [rightTab, setRightTab] = useState<'editor' | 'answer' | 'ai'>('editor');
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    getProblems({}).then(list => {
      const idx = list.findIndex(p => p.id === Number(id));
      if (idx !== -1) setDisplayNumber(idx + 1);
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    setLoading(true);
    getProblem(Number(id))
      .then(p => {
        setProblem(p);
        setPracticeCount((p as ProblemDetail & { practice_count: number }).practice_count ?? 0);
        const lang = LANGUAGE_MAP[p.category] || 'javascript';
        setLanguage(lang);
        setCode(DEFAULT_CODE[lang] || '');
        setLoading(false);
      })
      .catch(() => { setError('Failed to load problem.'); setLoading(false); });
  }, [id]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang] || '');
    setResult(null);
  };

  const handleRun = useCallback(async () => {
    if (!id || running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await runCode(Number(id), code, language);
      setResult(res);
    } catch {
      setResult({ status: 'Runtime Error', results: [], runtime_ms: 0 });
    } finally {
      setRunning(false);
    }
  }, [id, code, language, running]);

  const handleSubmit = useCallback(async () => {
    if (!problem || aiLoading) return;
    // AI grading only
    setResult(null);
    setAiLoading(true);
    setAiError('');
    setRightTab('ai');
    try {
      const res = await gradeCode({
        problemTitle: problem.title,
        description: problem.description,
        examples: problem.examples ?? [],
        solution: problem.solution ?? null,
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
  }, [problem, aiLoading, language, code]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProblem(Number(id));
      navigate('/');
    } catch {
      setDeleting(false);
      setDeleteModal(false);
    }
  };

  const handlePractice = async () => {
    if (incrementing) return;
    setIncrementing(true);
    try {
      const res = await incrementPracticeCount(Number(id));
      setPracticeCount(res.practice_count);
    } finally {
      setIncrementing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
  );
  if (error || !problem) return (
    <div className="p-8">
      <div className="text-sm mb-4" style={{ color: '#8B2A1A' }}>{error || 'Problem not found.'}</div>
      <Link to="/" className="text-sm underline" style={{ color: 'var(--color-text-secondary)' }}>← Back to problems</Link>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Left panel */}
      <div
        className="w-[45%] min-w-[360px] flex flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div className="px-5 py-4" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xs hover:underline" style={{ color: 'var(--color-text-muted)' }}>← Back</Link>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePractice}
                disabled={incrementing}
                className="text-xs px-3 py-1 rounded-lg transition-colors font-medium disabled:opacity-50"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                title="Mark as practiced"
              >
                +1 {practiceCount > 0 && <span style={{ color: 'var(--color-text-muted)' }}>({practiceCount})</span>}
              </button>
              <button
                onClick={() => navigate(`/problems/${id}/edit`)}
                className="text-xs px-3 py-1 rounded-lg transition-colors"
                style={{ background: 'var(--color-accent)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteModal(true)}
                className="text-xs px-3 py-1 rounded-lg transition-colors"
                style={{ background: '#F8E0DC', color: '#7A200E', border: '1px solid #E8B0A0' }}
              >
                Delete
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>#{displayNumber ?? problem.id}</span>
            <h1 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{problem.title}</h1>
            <DifficultyBadge d={problem.difficulty} />
            <span
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{ background: problem.category_color, color: 'var(--color-text-primary)' }}
            >
              {problem.category}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {problem.tags.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-content">
            {problem.description}
          </ReactMarkdown>

          {problem.examples && problem.examples.length > 0 && (
            <>
              <h3 className="text-sm font-semibold mt-5 mb-2" style={{ color: 'var(--color-text-primary)' }}>Examples</h3>
              <ExamplesBlock examples={problem.examples} />
            </>
          )}

          {problem.constraints && (
            <>
              <h3 className="text-sm font-semibold mt-5 mb-2" style={{ color: 'var(--color-text-primary)' }}>Constraints</h3>
              <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)', fontFamily: 'inherit' }}>
                {problem.constraints}
              </pre>
            </>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        {/* Tab bar + toolbar */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden text-xs font-medium" style={{ border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setRightTab('editor')}
              className="px-4 py-1.5 transition-colors"
              style={{
                background: rightTab === 'editor' ? 'var(--color-accent)' : 'transparent',
                color: rightTab === 'editor' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              }}
            >
              Editor
            </button>
            <button
              onClick={() => setRightTab('answer')}
              className="px-4 py-1.5 transition-colors"
              style={{
                background: rightTab === 'answer' ? 'var(--color-accent)' : 'transparent',
                color: rightTab === 'answer' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                borderLeft: '1px solid var(--color-border)',
              }}
            >
              Answer
            </button>
            <button
              onClick={() => setRightTab('ai')}
              className="px-4 py-1.5 transition-colors"
              style={{
                background: rightTab === 'ai' ? 'var(--color-accent)' : 'transparent',
                color: rightTab === 'ai' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                borderLeft: '1px solid var(--color-border)',
              }}
            >
              AI Grading
            </button>
          </div>

          {/* Editor controls (only visible in Editor tab) */}
          {rightTab === 'editor' && (
            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={e => handleLanguageChange(e.target.value)}
                className="input-base w-36"
                style={{ padding: '4px 10px' }}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="sql">SQL</option>
                <option value="text">Text</option>
              </select>
              {language !== 'text' && (
                <button
                  onClick={handleSubmit}
                  disabled={running || aiLoading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {running ? 'Running…' : aiLoading ? 'Grading…' : '▶ Submit'}
                </button>
              )}
              {language === 'text' && (
                <button
                  onClick={handleSubmit}
                  disabled={aiLoading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {aiLoading ? 'Grading…' : '▶ Submit'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Editor tab content */}
        {rightTab === 'editor' && (
          <>
            <div className="flex-1 overflow-hidden">
              <CodeEditor language={language} value={code} onChange={v => setCode(v ?? '')} />
            </div>
            {result && (
              <div style={{ height: 220, borderTop: '1px solid var(--color-border)', overflow: 'auto' }}>
                <ResultPanel result={result} />
              </div>
            )}
          </>
        )}

        {/* Answer tab content */}
        {rightTab === 'answer' && (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {problem.solution && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Solution Code</p>
                <pre className="rounded-lg p-4 text-sm font-mono overflow-x-auto mb-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                  {problem.solution}
                </pre>
              </>
            )}
            {problem.solution_explanation && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Explanation</p>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-content">
                  {problem.solution_explanation}
                </ReactMarkdown>
              </>
            )}
            {!problem.solution && !problem.solution_explanation && (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No solution provided for this problem.</p>
            )}
          </div>
        )}
        {/* AI Grading tab content */}
        {rightTab === 'ai' && (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {aiLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--color-text-muted)' }}>
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-accent-hover)', borderTopColor: 'transparent' }} />
                <span className="text-sm">AI is reviewing your code…</span>
              </div>
            )}
            {!aiLoading && aiError && (
              <div className="rounded-lg p-4 text-sm" style={{ background: '#F8E0DC', color: '#7A200E', border: '1px solid #E8B0A0' }}>
                {aiError}
              </div>
            )}
            {!aiLoading && !aiError && aiFeedback && (
              <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-content">
                {aiFeedback}
              </ReactMarkdown>
            )}
            {!aiLoading && !aiError && !aiFeedback && (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Submit your code to get AI feedback.</p>
            )}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(44,44,42,0.4)' }}
          onClick={() => !deleting && setDeleteModal(false)}
        >
          <div
            className="rounded-xl p-6 max-w-sm w-full mx-4 shadow-lg"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              Delete "{problem.title}"?
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(false)}
                disabled={deleting}
                className="btn-secondary px-4 py-2 text-xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                style={{ background: '#E8B0A0', color: '#7A200E', border: '1px solid #C4806C' }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

