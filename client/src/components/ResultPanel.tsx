import { ExecuteResult, RunResult } from '../api';

interface ResultPanelProps {
  result: ExecuteResult;
}

function statusColor(status: string) {
  if (status === 'Accepted') return 'text-green-400';
  if (status === 'Wrong Answer') return 'text-red-400';
  if (status === 'Time Limit Exceeded') return 'text-yellow-400';
  return 'text-orange-400';
}

function statusIcon(status: string) {
  if (status === 'Accepted') return '✓';
  return '✗';
}

function formatValue(v: unknown): string {
  if (v === undefined) return 'undefined';
  return JSON.stringify(v);
}

function CaseRow({ r, idx }: { r: RunResult; idx: number }) {
  return (
    <div className={`px-4 py-3 border-b border-gray-800 ${r.passed ? 'bg-green-950/30' : 'bg-red-950/30'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-bold ${r.passed ? 'text-green-400' : 'text-red-400'}`}>
          {r.passed ? '✓' : '✗'} Case {idx + 1}
        </span>
        <span className="text-xs text-gray-500">{r.runtime_ms} ms</span>
      </div>
      <div className="text-xs font-mono space-y-0.5">
        <div><span className="text-gray-500">Input:    </span><span className="text-gray-300">{formatValue(r.input)}</span></div>
        <div><span className="text-gray-500">Expected: </span><span className="text-gray-300">{formatValue(r.expected)}</span></div>
        <div>
          <span className="text-gray-500">Got:      </span>
          <span className={r.passed ? 'text-green-300' : 'text-red-300'}>{formatValue(r.actual)}</span>
        </div>
        {r.error && (
          <div className="text-red-400 mt-1 whitespace-pre-wrap">{r.error}</div>
        )}
      </div>
    </div>
  );
}

export default function ResultPanel({ result }: ResultPanelProps) {
  const color = statusColor(result.status);
  const icon = statusIcon(result.status);
  const passed = result.results.filter(r => r.passed).length;
  const total = result.results.length;

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        <span className={`font-bold text-sm ${color}`}>{icon} {result.status}</span>
        {total > 0 && (
          <span className="text-xs text-gray-400">{passed}/{total} test cases passed</span>
        )}
        {result.runtime_ms > 0 && (
          <span className="text-xs text-gray-500">· {result.runtime_ms} ms total</span>
        )}
      </div>

      {/* Cases */}
      <div className="flex-1 overflow-y-auto">
        {result.results.length === 0 ? (
          <div className="px-4 py-3 text-xs text-gray-500">No test case results.</div>
        ) : (
          result.results.map((r, i) => <CaseRow key={i} r={r} idx={i} />)
        )}
      </div>
    </div>
  );
}
