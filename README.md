# ByteQuiz

A self-hosted coding quiz app for practicing interview problems - algorithms,
SQL, system design, and more. Built with React, Express, and SQLite.

## Features

- Browse and filter problems by difficulty, category, and tags
- Write and run code in the browser with Monaco Editor
- View solutions and explanations without submitting
- Add your own problems with full Markdown support
- Create custom categories (SQL, system design, etc.)
- Zero external dependencies - runs fully on your machine

## Tech Stack

| Layer    | Technology                               |
|----------|------------------------------------------|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend  | Node.js + Express + TypeScript           |
| Database | SQLite (node:sqlite built-in)            |
| Editor   | Monaco Editor                            |

## Getting Started

### Prerequisites
- Node.js >= 22.5

### Install & Run
```bash
git clone https://github.com/andrewyang0620/ByteQuiz.git
cd ByteQuiz
npm run install:all
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
bytequiz/
|-- client/          # React frontend
|-- server/          # Express backend
|   -- data/        # SQLite database (gitignored)
-- README.md
```

## Adding Problems

Click **"+ Add Problem"** in the nav bar to add a problem via the UI,
or seed the database directly via server/src/db/seed.ts.

## Managing Categories

Go to **Categories** in the nav bar to add or remove custom categories.
Built-in categories (Array, SQL, etc.) cannot be deleted.

## License

MIT
