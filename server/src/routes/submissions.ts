import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';

const router = Router();

function getDb(req: Request): DatabaseSync {
  return req.app.locals.db as DatabaseSync;
}

// GET /api/submissions
router.get('/', (req: Request, res: Response) => {
  const db = getDb(req);
  const submissions = db.prepare(`
    SELECT s.id, s.problem_id, p.title AS problem_title, s.language, s.status, s.runtime_ms, s.submitted_at
    FROM submissions s
    JOIN problems p ON s.problem_id = p.id
    ORDER BY s.submitted_at DESC
    LIMIT 100
  `).all();

  res.json(submissions);
});

// GET /api/submissions/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb(req);
  const submission = db.prepare(`
    SELECT s.id, s.problem_id, p.title AS problem_title, s.language, s.code, s.status, s.runtime_ms, s.submitted_at
    FROM submissions s
    JOIN problems p ON s.problem_id = p.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!submission) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }

  res.json(submission);
});

export default router;
