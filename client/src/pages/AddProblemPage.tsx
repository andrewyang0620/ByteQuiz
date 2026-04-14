import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createProblem, getCategories, Category, Example } from '../api';

interface TestCaseForm { input: string; expected_output: string; }

const FIELD_STYLE = { background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)' };
const LABEL_STYLE = { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' as const };
const SECTION_STYLE = { borderBottom: '1px solid var(--color-border)', paddingBottom: 24, marginBottom: 24 };

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput('');
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ background: 'var(--color-accent)', color: 'var(--color-text-primary)' }}>
            {t}
            <button onClick={() => onChange(tags.filter(x => x !== t))} className="ml-1 font-bold hover:opacity-70">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Type tag and press Enter"
          className="input-base flex-1"
          style={{ padding: '6px 10px' }}
        />
        <button type="button" onClick={add} className="btn-secondary px-3 py-1 text-xs">+ Add</button>
      </div>
    </div>
  );
}

function ExampleFields({ examples, onChange }: { examples: Example[]; onChange: (e: Example[]) => void }) {
  const update = (i: number, field: keyof Example, value: string) => {
    const next = examples.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex);
    onChange(next);
  };
  const add = () => onChange([...examples, { input: '', output: '' }]);
  const remove = (i: number) => onChange(examples.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      {examples.map((ex, i) => (
        <div key={i} className="rounded-lg p-4 relative" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Example {i + 1}</span>
            {examples.length > 1 && (
              <button onClick={() => remove(i)} className="text-xs hover:opacity-70" style={{ color: '#8B2A1A' }}>Remove</button>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <label style={{ ...LABEL_STYLE, fontSize: 11 }}>Input *</label>
              <input value={ex.input} onChange={e => update(i, 'input', e.target.value)} className="input-base" />
            </div>
            <div>
              <label style={{ ...LABEL_STYLE, fontSize: 11 }}>Output *</label>
              <input value={ex.output} onChange={e => update(i, 'output', e.target.value)} className="input-base" />
            </div>
            <div>
              <label style={{ ...LABEL_STYLE, fontSize: 11 }}>Explanation (optional)</label>
              <input value={ex.explanation || ''} onChange={e => update(i, 'explanation', e.target.value)} className="input-base" />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="btn-secondary text-xs px-3 py-1.5">+ Add Example</button>
    </div>
  );
}

function TestCaseFields({ cases, onChange }: { cases: TestCaseForm[]; onChange: (c: TestCaseForm[]) => void }) {
  const update = (i: number, field: keyof TestCaseForm, value: string) => {
    onChange(cases.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };
  const add = () => onChange([...cases, { input: '', expected_output: '' }]);
  const remove = (i: number) => onChange(cases.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {cases.map((c, i) => (
        <div key={i} className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Test Case {i + 1}</span>
            {cases.length > 1 && (
              <button onClick={() => remove(i)} className="text-xs" style={{ color: '#8B2A1A' }}>Remove</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ ...LABEL_STYLE, fontSize: 11 }}>Input (JSON) *</label>
              <input value={c.input} onChange={e => update(i, 'input', e.target.value)} placeholder='e.g. [[2,7,11],9]' className="input-base font-mono" />
            </div>
            <div>
              <label style={{ ...LABEL_STYLE, fontSize: 11 }}>Expected Output (JSON) *</label>
              <input value={c.expected_output} onChange={e => update(i, 'expected_output', e.target.value)} placeholder='e.g. [0,1]' className="input-base font-mono" />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="btn-secondary text-xs px-3 py-1.5">+ Add Test Case</button>
    </div>
  );
}

export default function AddProblemPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');  

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [examples, setExamples] = useState<Example[]>([{ input: '', output: '' }]);
  const [constraints, setConstraints] = useState('');
  const [solution, setSolution] = useState('');
  const [solutionExplanation, setSolutionExplanation] = useState('');
  const [testCases, setTestCases] = useState<TestCaseForm[]>([{ input: '', expected_output: '' }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !difficulty || !categoryId || !description.trim()) {
      setFormError('Please fill in all required fields (Title, Difficulty, Category, Description).');
      return;
    }
    if (examples.some(ex => !ex.input.trim() || !ex.output.trim())) {
      setFormError('All examples must have Input and Output filled in.');
      return;
    }
    if (testCases.some(tc => !tc.input.trim() || !tc.expected_output.trim())) {
      setFormError('All test cases must have Input and Expected Output filled in.');
      return;
    }

    // Parse test cases from JSON strings
    let parsedTestCases: Array<{ input: unknown; expected_output: unknown }>;
    try {
      parsedTestCases = testCases.map(tc => ({
        input: JSON.parse(tc.input),
        expected_output: JSON.parse(tc.expected_output),
      }));
    } catch {
      setFormError('Test case Input/Expected Output must be valid JSON (e.g. [[1,2],3] or true).');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createProblem({
        title: title.trim(),
        difficulty,
        category_id: categoryId as number,
        tags,
        description: description.trim(),
        examples,
        constraints: constraints.trim(),
        solution: solution.trim(),
        solution_explanation: solutionExplanation.trim(),
        test_cases: parsedTestCases as Array<{ input: unknown[]; expected_output: unknown }>,
      });
      navigate(`/problems/${result.id}`);
    } catch {
      setFormError('Failed to create problem. Please check all fields and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="text-sm hover:underline" style={{ color: 'var(--color-text-muted)' }}>← Back</Link>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Add New Problem</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-0">
        {/* Basic info */}
        <div style={SECTION_STYLE}>
          <div className="mb-4">
            <label style={LABEL_STYLE}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="input-base" placeholder="e.g. Two Sum" style={FIELD_STYLE} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={LABEL_STYLE}>Difficulty *</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="input-base" style={FIELD_STYLE}>
                <option value="">Select…</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Category *</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                className="input-base"
                style={FIELD_STYLE}
              >
                <option value="">Select…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option disabled>─────────────</option>
                <option value="__new__">+ Manage Categories</option>
              </select>
              {categoryId === '__new__' as unknown as number && (
                <p className="text-xs mt-1">
                  <Link to="/categories" style={{ color: 'var(--color-accent-hover)' }}>Go to Categories page →</Link>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={SECTION_STYLE}>
          <label style={LABEL_STYLE}>Tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        {/* Description */}
        <div style={SECTION_STYLE}>
          <label style={LABEL_STYLE}>Description * <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(Markdown)</span></label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={8}
            className="input-base font-mono resize-y"
            placeholder="## Problem&#10;&#10;Describe the problem here using Markdown..."
            style={{ ...FIELD_STYLE, lineHeight: 1.6 }}
          />
        </div>

        {/* Examples */}
        <div style={SECTION_STYLE}>
          <label style={{ ...LABEL_STYLE, marginBottom: 12 }}>Examples * <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(at least 1)</span></label>
          <ExampleFields examples={examples} onChange={setExamples} />
        </div>

        {/* Constraints */}
        <div style={SECTION_STYLE}>
          <label style={LABEL_STYLE}>Constraints <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <textarea
            value={constraints}
            onChange={e => setConstraints(e.target.value)}
            rows={3}
            className="input-base resize-y"
            placeholder="e.g. 1 <= nums.length <= 10^4"
            style={FIELD_STYLE}
          />
        </div>

        {/* Solution */}
        <div style={SECTION_STYLE}>
          <label style={LABEL_STYLE}>Solution Code <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <textarea
            value={solution}
            onChange={e => setSolution(e.target.value)}
            rows={8}
            className="input-base font-mono resize-y"
            placeholder="function solution(...) { ... }"
            style={{ ...FIELD_STYLE, lineHeight: 1.6 }}
          />
        </div>

        {/* Solution Explanation */}
        <div style={SECTION_STYLE}>
          <label style={LABEL_STYLE}>Solution Explanation <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional, Markdown)</span></label>
          <textarea
            value={solutionExplanation}
            onChange={e => setSolutionExplanation(e.target.value)}
            rows={5}
            className="input-base resize-y"
            placeholder="## Approach&#10;&#10;Explain the solution..."
            style={{ ...FIELD_STYLE, lineHeight: 1.6 }}
          />
        </div>

        {/* Test Cases */}
        <div style={{ ...SECTION_STYLE, borderBottom: 'none' }}>
          <label style={{ ...LABEL_STYLE, marginBottom: 12 }}>Test Cases * <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(at least 1, values as JSON)</span></label>
          <TestCaseFields cases={testCases} onChange={setTestCases} />
        </div>

        {/* Error */}
        {formError && (
          <div className="rounded-lg px-4 py-3 text-sm mt-4" style={{ background: '#FDE8E8', color: '#8B2A1A', border: '1px solid #F5C0B8' }}>
            {formError}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5"
          >
            {submitting ? 'Creating…' : 'Create Problem'}
          </button>
          <Link to="/" className="btn-secondary px-6 py-2.5 inline-flex items-center">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
