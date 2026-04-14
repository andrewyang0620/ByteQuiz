import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export interface Category {
  id: number;
  name: string;
  color: string;
  is_default: boolean;
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
  test_cases: Array<{ input: unknown[]; expected_output: unknown }>;
}

// Categories
export const getCategories = () =>
  api.get<Category[]>('/categories').then(r => r.data);

export const createCategory = (data: { name: string; color: string }) =>
  api.post<Category>('/categories', data).then(r => r.data);

export const deleteCategory = (id: number) =>
  api.delete(`/categories/${id}`);

// Problems
export const getProblems = (params?: { difficulty?: string; category?: string; tag?: string; search?: string }) =>
  api.get<Problem[]>('/problems', { params }).then(r => r.data);

export const getProblem = (id: number) =>
  api.get<ProblemDetail>(`/problems/${id}`).then(r => r.data);

export const createProblem = (data: NewProblem) =>
  api.post<{ id: number }>('/problems', data).then(r => r.data);

export const runCode = (id: number, code: string, language: string) =>
  api.post<ExecuteResult>(`/problems/${id}/run`, { code, language }).then(r => r.data);

