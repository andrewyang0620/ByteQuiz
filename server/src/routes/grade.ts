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

The candidate's code is provided with explicit line numbers in the format "  N | <code>".
When referencing a line, always use the exact number shown before the | character.

Respond ONLY in the following Markdown structure, with exactly these three sections. Do not add any other sections or commentary outside this structure.

CLASSIFICATION RULES — read carefully before evaluating:

STEP 1 — Before classifying anything, ask: "Is this a surface-level mistake?"
Surface-level mistakes are: typos in variable names, method name misspellings,
wrong punctuation, indentation errors, missing/extra brackets, wrong casing on
identifiers, incorrect parameter names. These are ALWAYS 🟡 Format / Syntax Errors.
They must NEVER appear in 🔴 Logic Errors, even if fixing them would change the output.
The test is: "Did the candidate make a typing/spelling mistake?" If yes → 🟡 only.

STEP 2 — A 🔴 Logic Error is reserved exclusively for flaws in algorithmic thinking
or problem-solving reasoning: wrong algorithm choice, incorrect formula, missing edge
case handling, wrong conditional logic, incorrect data structure usage, wrong
aggregation or grouping strategy. The candidate understood the syntax but reasoned
incorrectly about the problem. If the mistake could have been caught by a spell-checker
or linter rather than by thinking about the problem — it is NOT a 🔴 Logic Error.

STEP 3 — Every issue appears in EXACTLY ONE section. Once classified, it does not
appear anywhere else — not even as a note or cross-reference in parentheses.

STEP 4 — Classification order:
  Is it a surface-level typo/spelling/punctuation/indentation mistake?
  → 🟡 Format / Syntax Errors. Stop. Do not also add to 🔴.

  Is it a wrong algorithm, wrong formula, wrong logic, missing edge case?
  → 🔴 Logic Errors. Stop. Do not also add to 🟡.

  Does the code run correctly but could be more efficient, cleaner, or safer?
  → 🔵 Enhancement Suggestions. Stop.

---

## 🔴 Logic Errors

The following are NEVER logic errors and must not appear in this section under any
circumstances: variable name typos, method name misspellings, wrong punctuation,
indentation, missing semicolons, bracket mismatches, parameter name mistakes,
identifier casing. If you find yourself writing a Logic Error entry about a typo
or spelling mistake, move it to 🟡 instead.

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

This section covers code that is correct and runs without errors. Only flag issues in
these three specific categories — nothing else:

**Category A — Time / Space Complexity**
If a more efficient algorithm or data structure exists for this problem, suggest it.
Include the current complexity and the improved complexity.
Format:
**Line <N>:** \`<current approach>\` — currently O(...), can be improved
💡 Suggestion: \`<improved approach>\` — reduces to O(...)

**Category B — Cleaner Package / Function Usage**
If the candidate used a verbose or low-level approach where a standard library
function, built-in method, or idiomatic language feature would be more concise and
conventional, suggest it.
Format:
**Line <N>:** \`<verbose code>\` — <name of cleaner alternative> exists for this
💡 Suggestion: \`<cleaner code>\`

**Category C — Potential Compile / Runtime Risk**
If a pattern works now but could silently fail in edge cases, cause a warning, or
behave unexpectedly in certain environments or inputs (e.g. integer overflow, implicit
type coercion, unhandled NULL, deprecated API usage), flag it.
Format:
**Line <N>:** \`<risky code>\` — <brief explanation of the risk>
💡 Suggestion: \`<safer code>\`

STRICT RULES for this section:
- Only output entries that fall into Category A, B, or C above.
- Do NOT comment on correct style, good naming, or things the candidate did well.
- Do NOT repeat any issue already mentioned in 🔴 or 🟡.
- If nothing qualifies under A, B, or C, output: ✅ No enhancements needed.`;

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
  lines.push(`Candidate's Solution (${body.language}) — with line numbers for reference:`);
  lines.push('```');
  const numberedLines = body.userCode
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(3, ' ')} | ${line}`);
  lines.push(numberedLines.join('\n'));
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
