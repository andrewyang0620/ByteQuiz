import vm from 'vm';

export interface TestCase {
  input: unknown[];
  expected_output: unknown;
}

export interface RunResult {
  passed: boolean;
  input: unknown[];
  expected: unknown;
  actual: unknown;
  error?: string;
  runtime_ms: number;
}

export interface ExecuteResult {
  status: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded';
  results: RunResult[];
  runtime_ms: number;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, (b as unknown[])[i]));
  }
  if (typeof a === 'object' && a !== null && b !== null) {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    if (!deepEqual(ka, kb)) return false;
    return ka.every(k => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

function runJavaScript(code: string, testCase: TestCase): RunResult {
  const start = Date.now();
  try {
    const wrappedCode = `
      ${code}
      __result__ = solution(...__args__);
    `;

    const sandbox: Record<string, unknown> = {
      __args__: testCase.input,
      __result__: undefined,
      console: { log: () => {} }, // suppress console output
    };

    const context = vm.createContext(sandbox);
    vm.runInContext(wrappedCode, context, { timeout: 2000 });

    const runtime_ms = Date.now() - start;
    const actual = sandbox['__result__'];
    const passed = deepEqual(actual, testCase.expected_output);

    return {
      passed,
      input: testCase.input,
      expected: testCase.expected_output,
      actual,
      runtime_ms,
    };
  } catch (err: unknown) {
    const runtime_ms = Date.now() - start;
    const isTimeout =
      err instanceof Error && err.message.toLowerCase().includes('timed out');
    return {
      passed: false,
      input: testCase.input,
      expected: testCase.expected_output,
      actual: undefined,
      error: err instanceof Error ? err.message : String(err),
      runtime_ms,
    };
  }
}

export function executeCode(
  code: string,
  language: string,
  testCases: TestCase[]
): ExecuteResult {
  if (language !== 'javascript') {
    // Mock for non-JS languages
    return {
      status: 'Runtime Error',
      results: testCases.map(tc => ({
        passed: false,
        input: tc.input,
        expected: tc.expected_output,
        actual: undefined,
        error: `Language '${language}' execution is not supported in the sandbox. Please use JavaScript.`,
        runtime_ms: 0,
      })),
      runtime_ms: 0,
    };
  }

  const results: RunResult[] = [];
  let totalRuntime = 0;

  for (const tc of testCases) {
    const result = runJavaScript(code, tc);
    results.push(result);
    totalRuntime += result.runtime_ms;

    if (result.error?.toLowerCase().includes('timed out')) {
      return {
        status: 'Time Limit Exceeded',
        results,
        runtime_ms: totalRuntime,
      };
    }
    if (result.error && !result.passed) {
      return {
        status: 'Runtime Error',
        results,
        runtime_ms: totalRuntime,
      };
    }
  }

  const allPassed = results.every(r => r.passed);
  return {
    status: allPassed ? 'Accepted' : 'Wrong Answer',
    results,
    runtime_ms: totalRuntime,
  };
}
