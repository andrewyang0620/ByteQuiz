import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProblems, Problem } from '../api';

const TAGS = ['Array', 'Hash Table', 'String', 'Stack', 'Linked List', 'Dynamic Programming', 'Tree', 'BFS', 'Recursion', 'Divide and Conquer'];

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const cls =
    difficulty === 'Easy' ? 'badge-easy' :
    difficulty === 'Medium' ? 'badge-medium' : 'badge-hard';
  return <span className={cls}>{difficulty}</span>;
}

export default function ProblemListPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [tag, setTag] = useState('');

  useEffect(() => {
    setLoading(true);
    getProblems({ difficulty: difficulty || undefined, tag: tag || undefined, search: search || undefined })
      .then(setProblems)
      .catch(() => setError('Failed to load problems. Make sure the server is running.'))
      .finally(() => setLoading(false));
  }, [difficulty, tag, search]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Problems</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search problems..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-green-500"
        />

        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
        >
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <select
          value={tag}
          onChange={e => setTag(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
        >
          <option value="">All Tags</option>
          {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {(difficulty || tag || search) && (
          <button
            onClick={() => { setDifficulty(''); setTag(''); setSearch(''); }}
            className="text-xs text-gray-400 hover:text-gray-200 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {error ? (
        <div className="text-red-400 bg-red-950 border border-red-800 rounded p-4">{error}</div>
      ) : loading ? (
        <div className="text-gray-500 py-12 text-center">Loading…</div>
      ) : (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-left">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3 text-right">Acceptance</th>
              </tr>
            </thead>
            <tbody>
              {problems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">No problems found.</td>
                </tr>
              ) : (
                problems.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`border-t border-gray-800 hover:bg-gray-900 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-900/30'}`}
                  >
                    <td className="px-4 py-3 text-gray-500">{p.id}</td>
                    <td className="px-4 py-3">
                      <Link to={`/problems/${p.id}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.tags.map(t => (
                          <button
                            key={t}
                            onClick={() => setTag(t)}
                            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <DifficultyBadge difficulty={p.difficulty} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {p.acceptance_rate.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
