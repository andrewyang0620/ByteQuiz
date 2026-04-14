import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

export function initDb(dbPath: string): DatabaseSync {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS problems (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      difficulty TEXT CHECK(difficulty IN ('Easy','Medium','Hard')),
      description TEXT,
      tags TEXT,
      solution TEXT,
      test_cases TEXT,
      acceptance_rate REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      problem_id INTEGER,
      language TEXT,
      code TEXT,
      status TEXT CHECK(status IN ('Accepted','Wrong Answer','Runtime Error','Time Limit Exceeded')),
      runtime_ms INTEGER,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(problem_id) REFERENCES problems(id)
    );
  `);

  return db;
}
