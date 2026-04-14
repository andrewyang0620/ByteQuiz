import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';

const router = Router();

function getDb(req: Request): DatabaseSync {
  return req.app.locals.db as DatabaseSync;
}

// GET /api/categories — all categories with problem count
router.get('/', (req: Request, res: Response) => {
  const db = getDb(req);
  const categories = db.prepare(`
    SELECT c.id, c.name, c.color, c.is_default,
           COUNT(p.id) as problem_count
    FROM categories c
    LEFT JOIN problems p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.is_default DESC, c.name ASC
  `).all() as Array<{
    id: number; name: string; color: string;
    is_default: number; problem_count: number;
  }>;

  res.json(categories.map(c => ({ ...c, is_default: c.is_default === 1 })));
});

// POST /api/categories — create new category
router.post('/', (req: Request, res: Response) => {
  const db = getDb(req);
  const { name, color } = req.body as { name?: string; color?: string };

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required.' });
    return;
  }

  const finalColor = (color && /^#[0-9A-Fa-f]{6}$/.test(color)) ? color : '#C3D4B5';

  try {
    const result = db.prepare(
      'INSERT INTO categories (name, color, is_default) VALUES (?, ?, 0)'
    ).run(name.trim(), finalColor);
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), color: finalColor, is_default: false });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'A category with this name already exists.' });
    } else {
      res.status(500).json({ error: 'Failed to create category.' });
    }
  }
});

// DELETE /api/categories/:id
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb(req);
  const cat = db.prepare('SELECT id, is_default FROM categories WHERE id = ?')
    .get(req.params.id) as { id: number; is_default: number } | undefined;

  if (!cat) { res.status(404).json({ error: 'Category not found.' }); return; }
  if (cat.is_default) { res.status(403).json({ error: 'Built-in categories cannot be deleted.' }); return; }

  const { n } = db.prepare('SELECT COUNT(*) as n FROM problems WHERE category_id = ?')
    .get(req.params.id) as { n: number };

  if (n > 0) {
    res.status(409).json({ error: `This category has ${n} problem(s). Reassign them before deleting.` });
    return;
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
