import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { executeCode, TestCase } from '../executor/runner';

const router = Router();

const VALID_CATEGORIES = [
  'Array','String','LinkedList','Tree','Graph',
  'DynamicProgramming','Stack','Queue','HashTable','BinarySearch','Sorting','Math',
];

function getDb(req: Request): DatabaseSync {
  return req.app.locals.db as DatabaseSync;
}

// GET /api/problems
router.get('/', (req: Request, res: Response) => {
  const db = getDb(req);
  const { difficulty, category, tag, search } = req.query;

  let query = 'SELECT id, title, difficulty, category, tags FROM problems WHERE 1=1';
  const params: import('node:sqlite').SQLInputValue[] = [];

  if (difficulty && typeof difficulty === 'string') {
    query += ' AND difficulty = ?';
    params.push(difficulty);
  }
  if (category && typeof category === 'string') {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search && typeof search === 'string') {
    query += ' AND title LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY id ASC';

  let problems = db.prepare(query).all(...params) as Array<{
    id: number; title: string; difficulty: string; category: string; tags: string;
  }>;

  if (tag && typeof tag === 'string') {
    problems = problems.filter(p => {
      try { return (JSON.parse(p.tags) as string[]).includes(tag); }
      catch { return false; }
    });
  }

  res.json(problems.map(p => ({ ...p, tags: JSON.parse(p.tags) })));
});

// GET /api/problems/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb(req);
  const problem = db.prepare(
    'SELECT id, title, difficulty, category, tags, description, examples, constraints, solution, solution_explanation, test_cases FROM problems WHERE id = ?'
  ).get(req.params.id) as Record<string, unknown> | undefined;

  if (!problem) { res.status(404).json({ error: 'Problem not found' }); return; }

  res.json({
    ...problem,
    tags: JSON.parse(problem.tags as string),
    examples: JSON.parse(problem.examples as string),
  });
});

// POST /api/problems  â€” create new problem
router.post('/', (req: Request, res: Response) => {
  const db = getDb(req);
  const { title, difficulty, category, tags, description, examples, constraints,
          solution, solution_explanation, test_cases } = req.body as Record<string, unknown>;

  if (!title || !difficulty || !category || !description || !examples || !test_cases) {
    res.status(400).json({ error: 'Missing required fields.' });
    return;
  }
  if (!['Easy','Medium','Hard'].includes(difficulty as string)) {
    res.status(400).json({ error: 'Invalid difficulty.' });
    return;
  }
  if (!VALID_CATEGORIES.includes(category as string)) {
    res.status(400).json({ error: 'Invalid category.' });
    return;
  }

  const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : (tags as string || '[]');
  const examplesStr = Array.isArray(examples) ? JSON.stringify(examples) : examples as string;
  const testCasesStr = Array.isArray(test_cases) ? JSON.stringify(test_cases) : test_cases as string;

  const result = db.prepare(`
    INSERT INTO problems (title, difficulty, category, tags, description, examples, constraints, solution, solution_explanation, test_cases)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title as string, difficulty as string, category as string, tagsStr,
         description as string, examplesStr, (constraints as string) || '',
         (solution as string) || '', (solution_explanation as string) || '', testCasesStr);

  res.status(201).json({ id: result.lastInsertRowid });
});

// POST /api/problems/:id/run  â€” run against sample test cases (front-end only, not saved)
router.post('/:id/run', (req: Request, res: Response) => {
  const db = getDb(req);
  const { code, language = 'javascript' } = req.body as { code: string; language?: string };

  if (!code) { res.status(400).json({ error: 'code is required' }); return; }

  const problem = db.prepare('SELECT test_cases FROM problems WHERE id = ?')
    .get(req.params.id) as { test_cases: string } | undefined;
  if (!problem) { res.status(404).json({ error: 'Problem not found' }); return; }

  const sampleCases: TestCase[] = JSON.parse(problem.test_cases).slice(0, 3);
  res.json(executeCode(code, language as string, sampleCases));
});

export default router;
