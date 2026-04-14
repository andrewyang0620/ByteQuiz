import { ExecuteResult, RunResult } from '../api';

interface ResultPanelProps {
  result: ExecuteResult;
}

function statusStyle(status: string): { color: string; bg: string } {
  if (status === 'Accepted')    return { color: '#3A6B2A', bg: '#DCF0D0' };
  if (status === 'Time Limit Exceeded') return { color: '#7A5A10', bg: '#F5E8C8' };
  return { color: '#8B2A1A', bg: '#F5D8D0' };
}

function formatValue(v: unknown): string {
  if (v === undefined) return 'undefined';
  return JSON.stringify(v);
}

function CaseRow({ r, idx }: { r: RunResult; idx: number }) {
  return (
    <div
      className="px-4 py-3"
      style={{
        borderBottom: '1px solid var(--color-border)',
        background: r.passed ? '#F0FAF0' : '#FDF0EE',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold" style={{ color: r.passed ? '#3A6B2A' : '#8B2A1A' }}>
          {r.passed ? '✓' : '✗'} Case {idx + 1}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{r.runtime_ms} ms</span>
      </div>
      <div className="text-xs font-mono space-y-0.5">
        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Input:    </span>
          <span style={{ color: 'var(--color-text-primary)' }}>{formatValue(r.input)}</span>
        </div>
        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Expected: </span>
          <span style={{ color: 'var(--color-text-primary)' }}>{formatValue(r.expected)}</span>
        </div>
        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Got:      </span>
          <span style={{ color: r.passed ? '#3A6B2A' : '#8B2A1A' }}>{formatValue(r.actual)}</span>
        </div>
        {r.error && (
          <div className="mt-1 whitespace-pre-wrap" style={{ color: '#8B2A1A' }}>{r.error}</div>
        )}
      </div>
    </div>
  );
}

export default function ResultPanel({ result }: ResultPanelProps) {
  const style = statusStyle(result.status);
  const passed = result.results.filter(r => r.passed).length;
  const total = result.results.length;

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <div
        className="flex items-center gap-3 px-4 py-2 text-sm font-semibold"
        style={{ background: style.bg, color: style.color, borderBottom: '1px solid var(--color-border)' }}
      >
        <span>{result.status === 'Accepted' ? '✓' : '✗'} {result.status}</span>
        {total > 0 && (
          <span className="font-normal text-xs" style={{ color: style.color, opacity: 0.8 }}>
            {passed}/{total} cases passed
          </span>
        )}
        {result.runtime_ms > 0 && (
          <span className="font-normal text-xs" style={{ color: style.color, opacity: 0.6 }}>
            · {result.runtime_ms} ms
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {result.results.length === 0 ? (
          <div className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>No test results.</div>
        ) : result.results.map((r, i) => <CaseRow key={i} r={r} idx={i} />)}
      </div>
    </div>
  );
}

