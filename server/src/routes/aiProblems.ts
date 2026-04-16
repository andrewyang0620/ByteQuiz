import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';

const router = Router();

function getDb(req: Request): DatabaseSync {
  return req.app.locals.db as DatabaseSync;
}

interface GenerateRequest {
  topics: string[];
  languages: string[];
  goal: 'job' | 'learning';
  jobRoles?: string[];
  jobLevel?: 'Junior' | 'Intermediate' | 'Senior';
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  skillLevel: number;
  extraNotes?: string;
  refinementNote?: string;
}

interface GeneratedProblem {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  tags: string[];
  language: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints?: string;
  solution?: string;
  solution_explanation?: string;
  test_cases: Array<{ input: unknown[]; expected_output: unknown }>;
}

const SYSTEM_PROMPT = `You are an expert programming educator and technical interviewer. Your job is to generate original, high-quality coding practice problems.

You will be given:
- Topics the user wants to practice
- Their programming language preference (if any)
- Their goal (job interview preparation or learning)
- Relevant context about the job or difficulty level
- The user's self-assessed skill level
- A list of already-existing problems to avoid duplication

Your response must be ONLY a valid JSON array containing exactly 3 problem objects. Do not include any explanation, markdown formatting, or text outside the JSON array.

Each problem object must follow this exact schema:
{
  "title": string,
  "difficulty": "Easy" | "Medium" | "Hard",
  "category": string,
  "tags": string[],
  "language": string,
  "description": string,
  "examples": [
    {
      "input": string,
      "output": string,
      "explanation": string
    }
  ],
  "constraints": string,
  "solution": string,
  "solution_explanation": string,
  "test_cases": [
    {
      "input": unknown[],
      "expected_output": unknown
    }
  ]
}

Rules:
- The 3 problems must vary in approach or sub-topic — do not generate 3 problems that test the same concept.
- Vary difficulty across the 3 problems when not constrained.
- Do not duplicate any problem in the existing problems list.
- If the language is "text" or the category is conceptual (System Design, etc.), leave test_cases as an empty array.
- Write descriptions that are detailed and comprehensive. Each description must include: a clear context/background, the full problem statement, explicit input/output format specification, and edge cases to consider. Aim for at least 200 words per description.
- For SQL problems: the description MUST include a "Table Schema" section with CREATE TABLE statement(s) and 3-5 rows of sample data in a Markdown table. This is required so the user can understand the data model. The solution must be a complete, correct SQL query.
- Write descriptions in clear, professional English.`;

function skillLabel(level: number): string {
  if (level <= 3) return 'Beginner';
  if (level <= 6) return 'Intermediate';
  return 'Advanced';
}

function buildUserPrompt(
  body: GenerateRequest,
  existingProblems: Array<{ title: string; difficulty: string; tags: string }>,
): string {
  const lines: string[] = [];

  lines.push('Generate 3 coding practice problems with the following requirements:');
  lines.push('');
  lines.push(`Topics: ${body.topics.join(', ')}`);

  if (body.languages && body.languages.length > 0) {
    lines.push(`Programming Language(s): ${body.languages.join(', ')}`);
  } else {
    lines.push('Programming Language: Infer the most appropriate language from the topics, or use "text" if conceptual.');
  }

  lines.push('');
  lines.push(`Goal: ${body.goal === 'job' ? 'Job Interview Preparation' : 'Learning & Skill Building'}`);
  lines.push('');

  if (body.goal === 'job') {
    if (body.jobRoles && body.jobRoles.length > 0) {
      lines.push(`Target Role(s): ${body.jobRoles.join(', ')}`);
    }
    if (body.jobLevel) {
      const roles = (body.jobRoles ?? []).join('/') || 'Software Engineer';
      lines.push(`Seniority Level: ${body.jobLevel}`);
      lines.push(`Generate problems that reflect the difficulty and expectations of a ${body.jobLevel} ${roles} technical interview.`);
    }
  } else {
    if (body.difficulty) {
      lines.push(`Difficulty Level: ${body.difficulty}`);
    }
  }

  lines.push('');
  lines.push(`Candidate Skill Level: ${body.skillLevel}/10 (${skillLabel(body.skillLevel)})`);
  lines.push('(1-3 = Beginner, 4-6 = Intermediate, 7-10 = Advanced)');
  lines.push('Adjust problem complexity and expected solution quality accordingly.');

  if (body.extraNotes && body.extraNotes.trim()) {
    lines.push('');
    lines.push('Additional Requirements:');
    lines.push(body.extraNotes.trim());
  }

  lines.push('');
  lines.push('Existing problems to avoid duplicating (title + difficulty + tags only):');
  for (const p of existingProblems) {
    let tags: string[] = [];
    try { tags = JSON.parse(p.tags) as string[]; } catch { tags = []; }
    lines.push(`- "${p.title}" [${p.difficulty}] tags: ${tags.join(', ')}`);
  }

  if (body.refinementNote && body.refinementNote.trim()) {
    lines.push('');
    lines.push('User Refinement for This Generation:');
    lines.push('The user has reviewed the previously generated problems and wants the next batch to be different in the following way:');
    lines.push(body.refinementNote.trim());
    lines.push('Take this into account when generating the 3 new problems.');
  }

  lines.push('');
  lines.push('Remember: respond with ONLY the JSON array, no other text.');

  return lines.join('\n');
}

// POST /api/ai-problems/generate
router.post('/generate', async (req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    res.status(503).json({ error: 'OpenAI API key not configured. Add OPENAI_API_KEY to server/.env' });
    return;
  }

  const body = req.body as GenerateRequest;
  if (!body.topics || !Array.isArray(body.topics) || body.topics.length === 0) {
    res.status(400).json({ error: 'topics is required and must be a non-empty array.' });
    return;
  }
  if (!body.goal || !['job', 'learning'].includes(body.goal)) {
    res.status(400).json({ error: 'goal must be "job" or "learning".' });
    return;
  }
  if (typeof body.skillLevel !== 'number' || body.skillLevel < 1 || body.skillLevel > 10) {
    res.status(400).json({ error: 'skillLevel must be a number between 1 and 10.' });
    return;
  }

  const db = getDb(req);

  // Save input to ai_inputs (refinementNote is NOT saved — it is a one-time delta)
  const inputResult = db.prepare(`
    INSERT INTO ai_inputs (topics, languages, goal, job_roles, job_level, difficulty, skill_level, extra_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    JSON.stringify(body.topics),
    JSON.stringify(body.languages ?? []),
    body.goal,
    body.jobRoles ? JSON.stringify(body.jobRoles) : null,
    body.jobLevel ?? null,
    body.difficulty ?? null,
    body.skillLevel,
    body.extraNotes ?? null,
  );
  const inputId = inputResult.lastInsertRowid as number;

  // Build deduplication context from existing problems + non-hidden proposals
  const existingProblems = db.prepare(`
    SELECT title, difficulty, tags FROM problems
    UNION ALL
    SELECT title, difficulty, tags FROM ai_proposals WHERE status != 'hidden'
  `).all() as Array<{ title: string; difficulty: string; tags: string }>;

  const userPrompt = buildUserPrompt(body, existingProblems);

  // Call OpenAI
  let generated: GeneratedProblem[];
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('OpenAI error:', response.status, errBody);
      res.status(502).json({ error: `OpenAI API error: ${response.status}` });
      return;
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    let raw = data.choices?.[0]?.message?.content ?? '';
    // Strip markdown fences
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    try {
      generated = JSON.parse(raw) as GeneratedProblem[];
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, '\nRaw:', raw);
      res.status(502).json({ error: 'Failed to parse AI response as JSON. The AI may have returned an unexpected format.' });
      return;
    }

    if (!Array.isArray(generated)) {
      res.status(502).json({ error: 'AI response was not a JSON array.' });
      return;
    }
  } catch (err) {
    console.error('Generate route error:', err);
    res.status(500).json({ error: 'Failed to contact OpenAI API.' });
    return;
  }

  // Insert each generated problem as an ai_proposal
  const proposals: Record<string, unknown>[] = [];
  for (const gp of generated) {
    // Find or create category by name (case-insensitive)
    let categoryId: number | null = null;
    if (gp.category && typeof gp.category === 'string') {
      const existing = db.prepare('SELECT id FROM categories WHERE lower(name) = lower(?)').get(gp.category) as { id: number } | undefined;
      if (existing) {
        categoryId = existing.id;
      } else {
        const catResult = db.prepare("INSERT INTO categories (name, color) VALUES (?, '#A8C4A0')").run(gp.category);
        categoryId = catResult.lastInsertRowid as number;
      }
    }

    const tagsStr = JSON.stringify(Array.isArray(gp.tags) ? gp.tags : []);
    const examplesStr = JSON.stringify(Array.isArray(gp.examples) ? gp.examples : []);
    const testCasesStr = JSON.stringify(Array.isArray(gp.test_cases) ? gp.test_cases : []);
    const difficulty = (['Easy', 'Medium', 'Hard'] as const).includes(gp.difficulty) ? gp.difficulty : 'Medium';

    const result = db.prepare(`
      INSERT INTO ai_proposals
        (source_input_id, title, difficulty, category_id, tags, description, examples, constraints, solution, solution_explanation, test_cases, language)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inputId,
      gp.title ?? 'Untitled',
      difficulty,
      categoryId,
      tagsStr,
      gp.description ?? '',
      examplesStr,
      gp.constraints ?? null,
      gp.solution ?? null,
      gp.solution_explanation ?? null,
      testCasesStr,
      gp.language ?? 'javascript',
    );

    const proposalId = result.lastInsertRowid as number;
    const row = db.prepare(`
      SELECT p.*, c.name as category, c.color as category_color
      FROM ai_proposals p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(proposalId) as Record<string, unknown>;

    proposals.push({
      ...row,
      tags: JSON.parse(row.tags as string),
      examples: JSON.parse(row.examples as string),
      test_cases: JSON.parse(row.test_cases as string),
    });
  }

  res.status(201).json(proposals);
});

// GET /api/ai-problems/proposals
router.get('/proposals', (req: Request, res: Response) => {
  const db = getDb(req);
  const rows = db.prepare(`
    SELECT
      p.*,
      c.name  AS category,
      c.color AS category_color,
      i.topics      AS input_topics,
      i.languages   AS input_languages,
      i.goal        AS input_goal,
      i.job_roles   AS input_job_roles,
      i.job_level   AS input_job_level,
      i.difficulty  AS input_difficulty,
      i.skill_level AS input_skill_level,
      i.extra_notes AS input_extra_notes,
      i.created_at  AS input_created_at
    FROM ai_proposals p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN ai_inputs  i ON i.id = p.source_input_id
    WHERE p.status != 'hidden'
    ORDER BY p.created_at DESC
  `).all() as Array<Record<string, unknown>>;

  const proposals = rows.map(row => ({
    id: row.id,
    source_input_id: row.source_input_id,
    title: row.title,
    difficulty: row.difficulty,
    category_id: row.category_id,
    category: row.category,
    category_color: row.category_color,
    tags: JSON.parse(row.tags as string),
    description: row.description,
    examples: JSON.parse(row.examples as string),
    constraints: row.constraints,
    solution: row.solution,
    solution_explanation: row.solution_explanation,
    test_cases: JSON.parse(row.test_cases as string),
    language: row.language,
    status: row.status,
    created_at: row.created_at,
    source_input: {
      id: row.source_input_id,
      topics: JSON.parse(row.input_topics as string),
      languages: JSON.parse(row.input_languages as string),
      goal: row.input_goal,
      job_roles: row.input_job_roles ? JSON.parse(row.input_job_roles as string) : null,
      job_level: row.input_job_level,
      difficulty: row.input_difficulty,
      skill_level: row.input_skill_level,
      extra_notes: row.input_extra_notes,
      created_at: row.input_created_at,
    },
  }));

  res.json(proposals);
});

// PATCH /api/ai-problems/proposals/hide-pending  (must be before /:id routes)
router.patch('/proposals/hide-pending', (req: Request, res: Response) => {
  const db = getDb(req);
  db.prepare("UPDATE ai_proposals SET status = 'hidden' WHERE status = 'pending'").run();
  res.json({ ok: true });
});

// PATCH /api/ai-problems/proposals/:id/accept
router.patch('/proposals/:id/accept', (req: Request, res: Response) => {
  const db = getDb(req);
  const proposalId = Number(req.params.id);

  const proposal = db.prepare('SELECT * FROM ai_proposals WHERE id = ?').get(proposalId) as Record<string, unknown> | undefined;
  if (!proposal) {
    res.status(404).json({ error: 'Proposal not found.' });
    return;
  }

  // Find a valid category_id or fall back to Uncategorized
  let categoryId = proposal.category_id as number | null;
  if (!categoryId) {
    const uncategorized = db.prepare("SELECT id FROM categories WHERE lower(name) = 'uncategorized' LIMIT 1").get() as { id: number } | undefined;
    categoryId = uncategorized?.id ?? null;
  }

  const result = db.prepare(`
    INSERT INTO problems (title, difficulty, category_id, tags, description, examples, constraints, solution, solution_explanation, test_cases)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    proposal.title as string,
    proposal.difficulty as string,
    categoryId,
    proposal.tags as string,
    proposal.description as string,
    proposal.examples as string,
    (proposal.constraints as string) ?? '',
    (proposal.solution as string) ?? '',
    (proposal.solution_explanation as string) ?? '',
    proposal.test_cases as string,
  );

  const problemId = result.lastInsertRowid as number;
  db.prepare("UPDATE ai_proposals SET status = 'accepted' WHERE id = ?").run(proposalId);

  res.json({ problemId });
});

// PATCH /api/ai-problems/proposals/:id/hide
router.patch('/proposals/:id/hide', (req: Request, res: Response) => {
  const db = getDb(req);
  db.prepare("UPDATE ai_proposals SET status = 'hidden' WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

// GET /api/ai-problems/last-input
router.get('/last-input', (req: Request, res: Response) => {
  const db = getDb(req);
  const row = db.prepare('SELECT * FROM ai_inputs ORDER BY created_at DESC LIMIT 1').get() as Record<string, unknown> | undefined;
  if (!row) {
    res.json(null);
    return;
  }
  res.json({
    id: row.id,
    topics: JSON.parse(row.topics as string),
    languages: JSON.parse(row.languages as string),
    goal: row.goal,
    job_roles: row.job_roles ? JSON.parse(row.job_roles as string) : null,
    job_level: row.job_level,
    difficulty: row.difficulty,
    skill_level: row.skill_level,
    extra_notes: row.extra_notes,
    created_at: row.created_at,
  });
});

export default router;
