import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getProblem, runCode, ProblemDetail, ExecuteResult, Example } from '../api';
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

function SolutionPanel({ solution, explanation }: { solution?: string; explanation?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
        style={{
          background: open ? 'var(--color-accent)' : 'var(--color-surface)',
          color: 'var(--color-text-primary)',
        }}
      >
        <span>View Answer</span>
        <span className="text-lg leading-none">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 py-4" style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
          {solution && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Solution Code</p>
              <pre className="rounded-lg p-4 text-sm font-mono overflow-x-auto" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                {solution}
              </pre>
            </>
          )}
          {explanation && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Explanation</p>
              <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-content">
                {explanation}
              </ReactMarkdown>
            </div>
          )}
          {!solution && !explanation && (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No solution provided for this problem.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecuteResult | null>(null);

  useEffect(() => {
    setLoading(true);
    getProblem(Number(id))
      .then(p => { setProblem(p); setLoading(false); })
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
          <Link to="/" className="text-xs hover:underline" style={{ color: 'var(--color-text-muted)' }}>← Back</Link>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>#{problem.id}</span>
            <h1 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{problem.title}</h1>
            <DifficultyBadge d={problem.difficulty} />
            <span className="badge-category">{problem.category}</span>
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

          <SolutionPanel solution={problem.solution} explanation={problem.solution_explanation} />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
          <select
            value={language}
            onChange={e => handleLanguageChange(e.target.value)}
            className="input-base w-36"
            style={{ padding: '4px 10px' }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>

          <button
            onClick={handleRun}
            disabled={running}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? 'Running…' : '▶ Run'}
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <CodeEditor language={language} value={code} onChange={v => setCode(v ?? '')} />
        </div>

        {/* Result panel */}
        {result && (
          <div style={{ height: 220, borderTop: '1px solid var(--color-border)', overflow: 'auto' }}>
            <ResultPanel result={result} />
          </div>
        )}
      </div>
    </div>
  );
}

