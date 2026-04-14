import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProblems, getCategories, Problem, Category } from '../api';

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const cls = difficulty === 'Easy' ? 'badge-easy' : difficulty === 'Medium' ? 'badge-medium' : 'badge-hard';
  return <span className={cls}>{difficulty}</span>;
}

export default function ProblemListPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getProblems({
      difficulty: difficulty || undefined,
      category: category || undefined,
      search: search || undefined,
    })
      .then(setProblems)
      .catch(() => setError('Failed to load problems. Make sure the server is running.'))
      .finally(() => setLoading(false));
  }, [difficulty, category, search]);

  const hasFilters = difficulty || category || search;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Problems
        </h1>
        <Link
          to="/problems/new"
          className="btn-primary text-sm px-4 py-2"
        >
          + Add Problem
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base w-48"
        />
        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
          className="input-base w-40"
        >
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="input-base w-48"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setDifficulty(''); setCategory(''); setSearch(''); }}
            className="text-xs underline"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {error ? (
        <div className="rounded-lg p-4 text-sm" style={{ background: '#FDE8E8', color: '#8B2A1A', border: '1px solid #F5C0B8' }}>
          {error}
        </div>
      ) : loading ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-4 py-3 text-left font-medium w-12" style={{ color: 'var(--color-text-muted)' }}>#</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>Title</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>Category</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>Tags</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {problems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
                    No problems found.
                  </td>
                </tr>
              ) : problems.map((p, idx) => (
                <tr
                  key={p.id}
                  style={{
                    borderTop: '1px solid var(--color-border)',
                    background: idx % 2 === 0 ? 'var(--color-bg)' : 'var(--color-surface)',
                  }}
                >
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/problems/${p.id}`}
                        className="font-medium hover:underline"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {p.title}
                      </Link>
                      {p.practice_count > 0 && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{ background: 'var(--color-accent)', color: 'var(--color-text-secondary)' }}
                          title="Times practiced"
                        >
                          ×{p.practice_count}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded"
                      style={{ background: p.category_color, color: 'var(--color-text-primary)' }}
                    >
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.tags.map(t => (
                        <span
                          key={t}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ background: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DifficultyBadge difficulty={p.difficulty} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
