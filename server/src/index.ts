import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db/schema';
import { seedDb } from './db/seed';
import problemsRouter from './routes/problems';
import submissionsRouter from './routes/submissions';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

// Initialize DB
const db = initDb(path.join(__dirname, '..', 'data', 'quiz.db'));
seedDb(db);

// Make db available to routes
app.locals.db = db;

// Routes
app.use('/api/problems', problemsRouter);
app.use('/api/submissions', submissionsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
