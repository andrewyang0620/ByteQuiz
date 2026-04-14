import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export interface Problem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  acceptance_rate: number;
}

export interface ProblemDetail extends Problem {
  description: string;
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
  submissionId?: number;
}

export interface Submission {
  id: number;
  problem_id: number;
  problem_title: string;
  language: string;
  status: string;
  runtime_ms: number;
  submitted_at: string;
  code?: string;
}

// Problems
export const getProblems = (params?: { difficulty?: string; tag?: string; search?: string }) =>
  api.get<Problem[]>('/problems', { params }).then(r => r.data);

export const getProblem = (id: number) =>
  api.get<ProblemDetail>(`/problems/${id}`).then(r => r.data);

export const runCode = (id: number, code: string, language: string) =>
  api.post<ExecuteResult>(`/problems/${id}/run`, { code, language }).then(r => r.data);

export const submitCode = (id: number, code: string, language: string) =>
  api.post<ExecuteResult>(`/problems/${id}/submit`, { code, language }).then(r => r.data);

export const getSolution = (id: number) =>
  api.get<{ solution: string }>(`/problems/${id}/solution`).then(r => r.data);

// Submissions
export const getSubmissions = () =>
  api.get<Submission[]>('/submissions').then(r => r.data);

export const getSubmission = (id: number) =>
  api.get<Submission>(`/submissions/${id}`).then(r => r.data);
