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
    SELECT c.id, c.name, c.color,
           COUNT(p.id) as problem_count
    FROM categories c
    LEFT JOIN problems p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all() as Array<{
    id: number; name: string; color: string; problem_count: number;
  }>;

  res.json(categories);
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
      'INSERT INTO categories (name, color) VALUES (?, ?)'
    ).run(name.trim(), finalColor);
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), color: finalColor });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'A category with this name already exists.' });
    } else {
      res.status(500).json({ error: 'Failed to create category.' });
    }
  }
});

// PUT /api/categories/:id — update name and/or color
router.put('/:id', (req: Request, res: Response) => {
  const db = getDb(req);
  const cat = db.prepare('SELECT id FROM categories WHERE id = ?')
    .get(req.params.id) as { id: number } | undefined;

  if (!cat) { res.status(404).json({ error: 'Category not found.' }); return; }

  const { name, color } = req.body as { name?: string; color?: string };
  if (!name || !name.trim()) { res.status(400).json({ error: 'Name is required.' }); return; }

  const finalColor = (color && /^#[0-9A-Fa-f]{6}$/.test(color)) ? color : undefined;

  try {
    if (finalColor) {
      db.prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?')
        .run(name.trim(), finalColor, req.params.id);
    } else {
      db.prepare('UPDATE categories SET name = ? WHERE id = ?')
        .run(name.trim(), req.params.id);
    }
    const updated = db.prepare('SELECT id, name, color FROM categories WHERE id = ?')
      .get(req.params.id) as { id: number; name: string; color: string };
    res.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'A category with this name already exists.' });
    } else {
      res.status(500).json({ error: 'Failed to update category.' });
    }
  }
});

// DELETE /api/categories/:id
// Query param: ?force=true  → reassign problems to "Uncategorized" fallback then delete
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb(req);
  const cat = db.prepare('SELECT id FROM categories WHERE id = ?')
    .get(req.params.id) as { id: number } | undefined;

  if (!cat) { res.status(404).json({ error: 'Category not found.' }); return; }

  const { n } = db.prepare('SELECT COUNT(*) as n FROM problems WHERE category_id = ?')
    .get(req.params.id) as { n: number };

  if (n > 0 && req.query.force !== 'true') {
    // Return 409 so frontend can show a confirmation with problem count
    res.status(409).json({ error: `This category has ${n} problem(s).`, problem_count: n });
    return;
  }

  if (n > 0) {
    // Ensure an "Uncategorized" fallback exists (custom, non-deletable by design)
    let fallback = db.prepare("SELECT id FROM categories WHERE name = 'Uncategorized'")
      .get() as { id: number } | undefined;
    if (!fallback) {
      const r = db.prepare(
        "INSERT OR IGNORE INTO categories (name, color, is_default) VALUES ('Uncategorized', '#A0A098', 0)"
      ).run();
      const newId = r.lastInsertRowid
        ? (r.lastInsertRowid as number)
        : (db.prepare("SELECT id FROM categories WHERE name = 'Uncategorized'").get() as { id: number }).id;
      fallback = { id: newId };
    }
    db.prepare('UPDATE problems SET category_id = ? WHERE category_id = ?')
      .run(fallback.id, cat.id);
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
