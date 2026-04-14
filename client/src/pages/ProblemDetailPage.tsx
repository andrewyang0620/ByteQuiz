import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getProblem, runCode, submitCode, getSolution, ProblemDetail, ExecuteResult } from '../api';
import CodeEditor from '../components/CodeEditor';
import ResultPanel from '../components/ResultPanel';

const DEFAULT_CODE: Record<string, string> = {
  javascript: `/**
 * @param {*} ...args
 * @return {*}
 */
function solution(...args) {
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

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'solution'>('description');
  const [solution, setSolution] = useState('');
  const [solutionError, setSolutionError] = useState('');

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

  const handleSubmit = useCallback(async () => {
    if (!id || submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await submitCode(Number(id), code, language);
      setResult(res);
    } catch {
      setResult({ status: 'Runtime Error', results: [], runtime_ms: 0 });
    } finally {
      setSubmitting(false);
    }
  }, [id, code, language, submitting]);

  const handleViewSolution = async () => {
    setSolutionError('');
    try {
      const data = await getSolution(Number(id));
      setSolution(data.solution);
      setActiveTab('solution');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setSolutionError(axiosErr.response?.data?.error ?? 'Failed to load solution.');
      } else {
        setSolutionError('Failed to load solution.');
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>;
  if (error || !problem) return (
    <div className="p-8">
      <div className="text-red-400 mb-4">{error || 'Problem not found.'}</div>
      <Link to="/" className="text-blue-400 hover:underline">← Back to problems</Link>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Left panel: description */}
      <div className="w-[45%] min-w-[360px] flex flex-col border-r border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 bg-gray-900">
          <div className="flex items-center justify-between mb-1">
            <Link to="/" className="text-xs text-gray-500 hover:text-gray-300">← Back</Link>
            <button
              onClick={handleViewSolution}
              className="text-xs text-yellow-400 hover:text-yellow-300 underline"
            >
              View Solution
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-gray-500 text-sm">#{problem.id}</span>
            <h1 className="text-lg font-bold">{problem.title}</h1>
            <DifficultyBadge d={problem.difficulty} />
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {problem.tags.map(t => (
              <span key={t} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{t}</span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-900">
          {(['description', 'solution'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-green-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'description' ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-dark">
              {problem.description}
            </ReactMarkdown>
          ) : solution ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-dark">
              {solution}
            </ReactMarkdown>
          ) : (
            <div className="text-yellow-400 text-sm mt-4">
              {solutionError || 'Submit the problem first to unlock the solution.'}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: editor + result */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800">
          <select
            value={language}
            onChange={e => handleLanguageChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm focus:outline-none focus:border-green-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={running || submitting}
              className="btn-secondary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? 'Running…' : '▶ Run'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={running || submitting}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <CodeEditor
            language={language}
            value={code}
            onChange={v => setCode(v ?? '')}
          />
        </div>

        {/* Result panel */}
        {result && (
          <div className="h-56 border-t border-gray-800 overflow-y-auto">
            <ResultPanel result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
