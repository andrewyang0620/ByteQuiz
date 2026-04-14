import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { executeCode, TestCase } from '../executor/runner';

const router = Router();

function getDb(req: Request): DatabaseSync {
  return req.app.locals.db as DatabaseSync;
}

// GET /api/problems
router.get('/', (req: Request, res: Response) => {
  const db = getDb(req);
  const { difficulty, tag, search } = req.query;

  let query = 'SELECT id, title, difficulty, tags, acceptance_rate FROM problems WHERE 1=1';
  const params: unknown[] = [];

  if (difficulty && typeof difficulty === 'string') {
    query += ' AND difficulty = ?';
    params.push(difficulty);
  }

  if (search && typeof search === 'string') {
    query += ' AND title LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY id ASC';

  let problems = db.prepare(query).all(...(params as import('node:sqlite').SQLInputValue[])) as Array<{
    id: number;
    title: string;
    difficulty: string;
    tags: string;
    acceptance_rate: number;
  }>;

  // Filter by tag (stored as JSON array, filter in JS)
  if (tag && typeof tag === 'string') {
    problems = problems.filter(p => {
      try {
        const tags: string[] = JSON.parse(p.tags);
        return tags.includes(tag);
      } catch {
        return false;
      }
    });
  }

  res.json(problems.map(p => ({ ...p, tags: JSON.parse(p.tags) })));
});

// GET /api/problems/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb(req);
  const problem = db.prepare(
    'SELECT id, title, difficulty, description, tags, acceptance_rate FROM problems WHERE id = ?'
  ).get(req.params.id) as { tags: string } | undefined;

  if (!problem) {
    res.status(404).json({ error: 'Problem not found' });
    return;
  }

  res.json({ ...problem, tags: JSON.parse((problem as { tags: string }).tags) });
});

// POST /api/problems/:id/run  — runs only sample test cases (first 3)
router.post('/:id/run', (req: Request, res: Response) => {
  const db = getDb(req);
  const { code, language = 'javascript' } = req.body as { code: string; language?: string };

  if (!code) {
    res.status(400).json({ error: 'code is required' });
    return;
  }

  const problem = db.prepare('SELECT test_cases FROM problems WHERE id = ?').get(req.params.id) as
    | { test_cases: string }
    | undefined;

  if (!problem) {
    res.status(404).json({ error: 'Problem not found' });
    return;
  }

  const allCases: TestCase[] = JSON.parse(problem.test_cases);
  const sampleCases = allCases.slice(0, 3);

  const result = executeCode(code, language as string, sampleCases);
  res.json(result);
});

// POST /api/problems/:id/submit  — runs all test cases and saves submission
router.post('/:id/submit', (req: Request, res: Response) => {
  const db = getDb(req);
  const { code, language = 'javascript' } = req.body as { code: string; language?: string };

  if (!code) {
    res.status(400).json({ error: 'code is required' });
    return;
  }

  const problem = db.prepare('SELECT test_cases FROM problems WHERE id = ?').get(req.params.id) as
    | { test_cases: string }
    | undefined;

  if (!problem) {
    res.status(404).json({ error: 'Problem not found' });
    return;
  }

  const testCases: TestCase[] = JSON.parse(problem.test_cases);
  const result = executeCode(code, language as string, testCases);

  const submission = db.prepare(`
    INSERT INTO submissions (problem_id, language, code, status, runtime_ms)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, language, code, result.status, result.runtime_ms);

  res.json({ submissionId: submission.lastInsertRowid, ...result });
});

// GET /api/problems/:id/solution  — only accessible after at least one submission
router.get('/:id/solution', (req: Request, res: Response) => {
  const db = getDb(req);

  const submission = db.prepare(
    'SELECT id FROM submissions WHERE problem_id = ? LIMIT 1'
  ).get(req.params.id);

  if (!submission) {
    res.status(403).json({ error: 'Submit the problem at least once to unlock the solution.' });
    return;
  }

  const problem = db.prepare('SELECT solution FROM problems WHERE id = ?').get(req.params.id) as
    | { solution: string }
    | undefined;

  if (!problem) {
    res.status(404).json({ error: 'Problem not found' });
    return;
  }

  res.json({ solution: problem.solution });
});

export default router;
