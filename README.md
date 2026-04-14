# Quizzing Tech — Local Coding Quiz App

A full-stack coding practice platform inspired by LeetCode. Practice algorithm problems, view solutions, and track submission history — all running locally.

---

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Start dev servers (frontend + backend simultaneously)
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Code Editor | Monaco Editor (VS Code engine) |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite via better-sqlite3 |
| Code Execution | Node.js `vm` module (sandboxed) |

---

## Project Structure

```
├── client/          # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── api/
├── server/          # Express backend
│   └── src/
│       ├── routes/
│       ├── db/
│       └── executor/
└── package.json     # Root monorepo scripts
```

---

## Adding New Problems

Edit `server/src/db/seed.ts` and add a new entry in the `problems` array, then restart the server.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/problems` | List problems (`?difficulty=&tag=&search=`) |
| GET | `/api/problems/:id` | Problem detail |
| POST | `/api/problems/:id/run` | Run against sample cases |
| POST | `/api/problems/:id/submit` | Submit against all test cases |
| GET | `/api/problems/:id/solution` | Get official solution (requires a submission) |
| GET | `/api/submissions` | Submission history |
| GET | `/api/submissions/:id` | Single submission detail |

---

## Pushing to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/quizzing-tech.git
git push -u origin main
```