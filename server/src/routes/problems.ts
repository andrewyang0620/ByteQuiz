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
  const { difficulty, category, tag, search } = req.query;

  let query = `
    SELECT p.id, p.title, p.difficulty,
           c.id   AS category_id,
           c.name AS category,
           c.color AS category_color,
           p.tags, p.practice_count
    FROM problems p
    JOIN categories c ON c.id = p.category_id
    WHERE 1=1`;
  const params: import('node:sqlite').SQLInputValue[] = [];

  if (difficulty && typeof difficulty === 'string') {
    query += ' AND p.difficulty = ?';
    params.push(difficulty);
  }
  if (category && typeof category === 'string') {
    query += ' AND c.name = ?';
    params.push(category);
  }
  if (search && typeof search === 'string') {
    query += ' AND p.title LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY p.id ASC';

  let problems = db.prepare(query).all(...params) as Array<{
    id: number; title: string; difficulty: string;
    category_id: number; category: string; category_color: string; tags: string; practice_count: number;
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
  const problem = db.prepare(`
    SELECT p.id, p.title, p.difficulty,
           c.id   AS category_id,
           c.name AS category,
           c.color AS category_color,
           p.tags, p.description, p.examples, p.constraints,
           p.solution, p.solution_explanation, p.test_cases, p.practice_count
    FROM problems p
    JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(req.params.id) as Record<string, unknown> | undefined;

  if (!problem) { res.status(404).json({ error: 'Problem not found' }); return; }

  res.json({
    ...problem,
    tags: JSON.parse(problem.tags as string),
    examples: JSON.parse(problem.examples as string),
  });
});

// POST /api/problems � create new problem
router.post('/', (req: Request, res: Response) => {
  const db = getDb(req);
  const { title, difficulty, category_id, tags, description, examples, constraints,
          solution, solution_explanation, test_cases } = req.body as Record<string, unknown>;

  if (!title || !difficulty || !category_id || !description) {
    res.status(400).json({ error: 'Missing required fields.' });
    return;
  }
  if (!['Easy','Medium','Hard'].includes(difficulty as string)) {
    res.status(400).json({ error: 'Invalid difficulty.' });
    return;
  }

  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id as number);
  if (!cat) {
    res.status(400).json({ error: 'Invalid category_id.' });
    return;
  }

  const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : (tags as string || '[]');
  const examplesStr = Array.isArray(examples) ? JSON.stringify(examples) : examples as string;
  const testCasesStr = Array.isArray(test_cases) ? JSON.stringify(test_cases) : test_cases as string;

  const result = db.prepare(`
    INSERT INTO problems (title, difficulty, category_id, tags, description, examples, constraints, solution, solution_explanation, test_cases)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title as string, difficulty as string, category_id as number, tagsStr,
    description as string, examplesStr, (constraints as string) || '',
    (solution as string) || '', (solution_explanation as string) || '', testCasesStr
  );

  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT /api/problems/:id — update a problem
router.put('/:id', (req: Request, res: Response) => {
  const db = getDb(req);
  const existing = db.prepare('SELECT id FROM problems WHERE id = ?').get(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Problem not found' }); return; }

  const { title, difficulty, category_id, tags, description, examples, constraints,
          solution, solution_explanation, test_cases } = req.body as Record<string, unknown>;

  if (!title || !difficulty || !category_id || !description) {
    res.status(400).json({ error: 'Missing required fields.' });
    return;
  }
  if (!['Easy','Medium','Hard'].includes(difficulty as string)) {
    res.status(400).json({ error: 'Invalid difficulty.' });
    return;
  }

  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id as number);
  if (!cat) { res.status(400).json({ error: 'Invalid category_id.' }); return; }

  const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : (tags as string || '[]');
  const examplesStr = Array.isArray(examples) ? JSON.stringify(examples) : (examples as string || '[]');
  const testCasesStr = Array.isArray(test_cases) ? JSON.stringify(test_cases) : (test_cases as string || '[]');

  db.prepare(`
    UPDATE problems SET title=?, difficulty=?, category_id=?, tags=?, description=?,
      examples=?, constraints=?, solution=?, solution_explanation=?, test_cases=?
    WHERE id=?
  `).run(
    title as string, difficulty as string, category_id as number, tagsStr,
    description as string, examplesStr, (constraints as string) || '',
    (solution as string) || '', (solution_explanation as string) || '', testCasesStr,
    req.params.id
  );

  res.json({ id: Number(req.params.id) });
});

// DELETE /api/problems/:id
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb(req);
  const existing = db.prepare('SELECT id FROM problems WHERE id = ?').get(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Problem not found' }); return; }
  db.prepare('DELETE FROM problems WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// POST /api/problems/:id/practice — increment practice count
router.post('/:id/practice', (req: Request, res: Response) => {
  const db = getDb(req);
  const existing = db.prepare('SELECT id FROM problems WHERE id = ?').get(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Problem not found' }); return; }
  db.prepare('UPDATE problems SET practice_count = practice_count + 1 WHERE id = ?').run(req.params.id);
  const row = db.prepare('SELECT practice_count FROM problems WHERE id = ?')
    .get(req.params.id) as { practice_count: number };
  res.json({ practice_count: row.practice_count });
});

// POST /api/problems/:id/run � run sample test cases
router.post('/:id/run', async (req: Request, res: Response) => {
  const db = getDb(req);
  const problem = db.prepare('SELECT test_cases FROM problems WHERE id = ?')
    .get(req.params.id) as { test_cases: string } | undefined;

  if (!problem) { res.status(404).json({ error: 'Problem not found' }); return; }

  const { code, language } = req.body as { code: string; language: string };
  if (!code || !language) { res.status(400).json({ error: 'code and language are required' }); return; }

  let testCases: TestCase[];
  try {
    testCases = JSON.parse(problem.test_cases) as TestCase[];
  } catch {
    res.status(500).json({ error: 'Invalid test case data' }); return;
  }

  try {
    const result = await executeCode(code, language, testCases);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;

