import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ProblemListPage from './pages/ProblemListPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import SubmissionsPage from './pages/SubmissionsPage';

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6 sticky top-0 z-50">
        <Link to="/" className="text-green-400 font-bold text-lg tracking-tight hover:text-green-300">
          💻 Quizzing Tech
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link
            to="/"
            className={`hover:text-white transition-colors ${location.pathname === '/' ? 'text-white font-medium' : 'text-gray-400'}`}
          >
            Problems
          </Link>
          <Link
            to="/submissions"
            className={`hover:text-white transition-colors ${location.pathname === '/submissions' ? 'text-white font-medium' : 'text-gray-400'}`}
          >
            Submissions
          </Link>
        </nav>
      </header>

      {/* Page */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<ProblemListPage />} />
          <Route path="/problems/:id" element={<ProblemDetailPage />} />
          <Route path="/submissions" element={<SubmissionsPage />} />
        </Routes>
      </main>
    </div>
  );
}
