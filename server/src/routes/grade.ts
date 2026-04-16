import { Router, Request, Response } from 'express';

const router = Router();

// Output language for AI feedback: 'en' for English, 'zh' for Simplified Chinese
const OUTPUT_LANGUAGE = 'zh';

interface GradeRequest {
  problemTitle: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  solution: string | null;
  userCode: string;
  language: string;
}

const SYSTEM_PROMPT_BASE = `You are a strict but constructive code reviewer. Your job is to evaluate a candidate's solution to a coding problem.

You will be given:
- The problem statement
- Input/output examples (if any)
- A reference answer (if provided)
- The candidate's code submission

Respond ONLY in the following Markdown structure, with exactly these three sections. Do not add any other sections or commentary outside this structure.

---

## 🔴 Logic Errors

For each logic error found, output one entry in this format:
**Line <N>:** \`<original code on that line>\` — <explanation of the error>
✅ Fix: \`<corrected code>\`

If no logic errors are found, output:
✅ No logic errors found.

---

## 🟡 Format / Syntax Errors

For each error that would cause incorrect behavior, a runtime failure, or a meaningful
misunderstanding of the code — such as wrong variable names, typos that break execution,
syntax mistakes, or naming convention violations that conflict with the language spec —
output one entry in this format:
**Line <N>:** \`<wrong code>\` → \`<correct code>\`

Do NOT include stylistic preferences here (e.g. SQL capitalization, trailing semicolons,
spacing, indentation, quote style). Those belong in Enhancement Suggestions.

If no format/syntax errors are found, output:
✅ No format or syntax errors found.

---

## 🔵 Enhancement Suggestions

This section covers code that runs correctly and has no errors, but where small
improvements would make it more readable, idiomatic, or professional.

Include things like:
- SQL style: keyword casing (SELECT vs select), trailing semicolons, indentation,
  alias clarity, quote style
- Naming: variable or alias names that work but are unclear or non-descriptive
- Redundancy: unnecessary clauses, verbose expressions that could be simplified
- Idiomatic patterns: a working solution that could use a more standard/conventional
  approach for the language (e.g. using COUNT(*) vs COUNT(1) in SQL)
- Minor best practices specific to the language or query dialect

For each suggestion, output one entry in this format:
**Line <N>:** \`<current code>\` — <brief reason why the change is beneficial>
💡 Suggestion: \`<improved code>\`

If no enhancement suggestions exist, output:
✅ No enhancements needed.`;

const SYSTEM_PROMPT = OUTPUT_LANGUAGE === 'zh'
  ? SYSTEM_PROMPT_BASE + '\n\nIMPORTANT: All your responses must be written entirely in Simplified Chinese (简体中文). Translate all section headers, explanations, and suggestions to Chinese.'
  : SYSTEM_PROMPT_BASE;

function buildUserPrompt(body: GradeRequest): string {
  const lines: string[] = [];

  lines.push(`Problem: ${body.problemTitle}`);
  lines.push('');
  lines.push('Description:');
  lines.push(body.description);

  if (body.examples && body.examples.length > 0) {
    lines.push('');
    lines.push('Examples:');
    for (const ex of body.examples) {
      lines.push(`Input: ${ex.input}`);
      lines.push(`Output: ${ex.output}`);
      if (ex.explanation) lines.push(`Explanation: ${ex.explanation}`);
    }
  }

  if (body.solution && body.solution.trim()) {
    lines.push('');
    lines.push('Reference Answer:');
    lines.push(body.solution);
  }

  lines.push('');
  lines.push(`Candidate's Solution (${body.language}):`);
  lines.push('```' + body.language);
  lines.push(body.userCode);
  lines.push('```');
  lines.push('');
  lines.push('Please review the candidate\'s solution according to your instructions.');

  return lines.join('\n');
}

// POST /api/grade
router.post('/', async (req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    res.status(503).json({ error: 'OpenAI API key not configured. Add OPENAI_API_KEY to server/.env' });
    return;
  }

  const body = req.body as GradeRequest;
  if (!body.userCode || !body.problemTitle) {
    res.status(400).json({ error: 'Missing required fields: userCode, problemTitle' });
    return;
  }

  const userPrompt = buildUserPrompt(body);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0,
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

    const feedback = data.choices?.[0]?.message?.content ?? '';
    res.json({ feedback });
  } catch (err) {
    console.error('Grade route error:', err);
    res.status(500).json({ error: 'Failed to contact OpenAI API.' });
  }
});

export default router;
