import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSubmissions, getSubmission, Submission } from '../api';

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'Accepted' ? 'text-green-400' :
    status === 'Wrong Answer' ? 'text-red-400' :
    status === 'Time Limit Exceeded' ? 'text-yellow-400' :
    'text-orange-400';
  return <span className={`text-sm font-medium ${cls}`}>{status}</span>;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);

  useEffect(() => {
    getSubmissions()
      .then(setSubmissions)
      .finally(() => setLoading(false));
  }, []);

  const openDetail = async (id: number) => {
    try {
      const s = await getSubmission(id);
      setSelected(s);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Submission History</h1>

      {loading ? (
        <div className="text-gray-500 py-12 text-center">Loading…</div>
      ) : (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-left">
                <th className="px-4 py-3">Problem</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Runtime</th>
                <th className="px-4 py-3">Submitted At</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No submissions yet. <Link to="/" className="text-blue-400 hover:underline">Solve a problem!</Link>
                  </td>
                </tr>
              ) : (
                submissions.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`border-t border-gray-800 hover:bg-gray-900 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-900/30'}`}
                  >
                    <td className="px-4 py-3">
                      <Link to={`/problems/${s.problem_id}`} className="text-blue-400 hover:underline">
                        {s.problem_title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-300 capitalize">{s.language}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-gray-400">{s.runtime_ms} ms</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(s.submitted_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(s.id)}
                        className="text-xs text-blue-400 hover:underline"
                      >
                        View code
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Code modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <div>
                <span className="font-medium">{selected.problem_title}</span>
                <span className="text-gray-500 text-sm ml-3 capitalize">{selected.language}</span>
                <StatusBadge status={selected.status} />
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <pre className="overflow-auto p-5 text-sm text-green-300 font-mono bg-gray-950 flex-1">
              {selected.code}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
