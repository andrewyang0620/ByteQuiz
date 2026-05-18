import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export interface Category {
  id: number;
  name: string;
  color: string;
  problem_count: number;
}

export interface Problem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category_id: number;
  category: string;
  category_color: string;
  tags: string[];
  practice_count: number;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface ProblemDetail extends Problem {
  description: string;
  examples: Example[];
  constraints?: string;
  solution?: string;
  solution_explanation?: string;
  test_cases: string;
}

export interface RunResult {
  passed: boolean;
  input: unknown[];
  expected: unknown;
  actual: unknown;
  error?: string;
  runtime_ms: number;
}

export interface ExecuteResult {
  status: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded';
  results: RunResult[];
  runtime_ms: number;
}

export interface NewProblem {
  title: string;
  difficulty: string;
  category_id: number;
  tags: string[];
  description: string;
  examples: Example[];
  constraints?: string;
  solution?: string;
  solution_explanation?: string;
  test_cases: Array<{ input: unknown; expected_output: unknown }>;
}

// Categories
export const getCategories = () =>
  api.get<Category[]>('/categories').then(r => r.data);

export const createCategory = (data: { name: string; color: string }) =>
  api.post<Category>('/categories', data).then(r => r.data);

export const updateCategory = (id: number, data: { name: string; color: string }) =>
  api.put<Category>(`/categories/${id}`, data).then(r => r.data);

export const deleteCategory = (id: number, force = false) =>
  api.delete(`/categories/${id}${force ? '?force=true' : ''}`);

// Problems
export const getProblems = (params?: { difficulty?: string; category?: string; tag?: string; search?: string }) =>
  api.get<Problem[]>('/problems', { params }).then(r => r.data);

export const getProblem = (id: number) =>
  api.get<ProblemDetail>(`/problems/${id}`).then(r => r.data);

export const createProblem = (data: NewProblem) =>
  api.post<{ id: number }>('/problems', data).then(r => r.data);

export const updateProblem = (id: number, data: NewProblem) =>
  api.put<{ id: number }>(`/problems/${id}`, data).then(r => r.data);

export const deleteProblem = (id: number) =>
  api.delete(`/problems/${id}`);

export const incrementPracticeCount = (id: number) =>
  api.post<{ practice_count: number }>(`/problems/${id}/practice`).then(r => r.data);

export const runCode = (id: number, code: string, language: string) =>
  api.post<ExecuteResult>(`/problems/${id}/run`, { code, language }).then(r => r.data);

export interface GradePayload {
  problemTitle: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  solution: string | null;
  userCode: string;
  language: string;
}

export const gradeCode = (payload: GradePayload) =>
  api.post<{ feedback: string }>('/grade', payload).then(r => r.data);

// ─── AI Problems ────────────────────────────────────────────────────────────

export interface AIInput {
  id: number;
  topics: string[];
  languages: string[];
  goal: 'job' | 'learning';
  job_roles: string[] | null;
  job_level: string | null;
  difficulty: string | null;
  skill_level: number;
  extra_notes: string | null;
  created_at: string;
}

export interface AIProposal {
  id: number;
  source_input_id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category_id: number | null;
  category?: string;
  category_color?: string;
  tags: string[];
  description: string;
  examples: Example[];
  constraints?: string | null;
  solution?: string | null;
  solution_explanation?: string | null;
  test_cases: unknown[];
  language: string;
  status: 'pending' | 'accepted' | 'hidden';
  created_at: string;
  source_input?: AIInput;
}

export interface GeneratePayload {
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

export interface GenerationSummary {
  reasoning: string;
  coverage: string[];
  goal_note: string;
}

export const generateProblems = (payload: GeneratePayload) =>
  api.post<{ proposals: AIProposal[]; generationSummary: GenerationSummary | null }>('/ai-problems/generate', payload).then(r => r.data);

export const getProposals = () =>
  api.get<AIProposal[]>('/ai-problems/proposals').then(r => r.data);

export const acceptProposal = (id: number) =>
  api.patch<{ problemId: number }>(`/ai-problems/proposals/${id}/accept`).then(r => r.data);

export const hideProposal = (id: number) =>
  api.patch(`/ai-problems/proposals/${id}/hide`).then(() => undefined);

export const hidePendingProposals = () =>
  api.patch('/ai-problems/proposals/hide-pending').then(() => undefined);

export const getGenerationCache = (): Promise<Array<{
  category_id: number | null;
  category_name: string | null;
  hidden_count: number;
}>> =>
  api.get('/ai-problems/cache').then(r => r.data);

export const clearGenerationCache = (categoryId?: number): Promise<void> =>
  api.delete(`/ai-problems/cache${categoryId !== undefined ? `?category_id=${categoryId}` : ''}`).then(() => undefined);

export const getLastInput = () =>
  api.get<AIInput | null>('/ai-problems/last-input').then(r => r.data);

