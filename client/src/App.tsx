import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ProblemListPage from './pages/ProblemListPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import AddProblemPage from './pages/AddProblemPage';

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Nav */}
      <header
        className="px-6 py-3 flex items-center gap-6 sticky top-0 z-50"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px' }}>
            <span style={{ color: 'var(--color-text-primary)' }}>Byte</span>
            <span style={{ color: 'var(--color-accent-hover)' }}>Quiz</span>
          </span>
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link
            to="/"
            style={{
              color: location.pathname === '/' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              fontWeight: location.pathname === '/' ? 600 : 400,
              textDecoration: 'none',
            }}
          >
            Problems
          </Link>
        </nav>
      </header>

      {/* Page */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<ProblemListPage />} />
          <Route path="/problems/new" element={<AddProblemPage />} />
          <Route path="/problems/:id" element={<ProblemDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
