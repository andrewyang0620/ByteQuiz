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
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      title                TEXT NOT NULL,
      difficulty           TEXT CHECK(difficulty IN ('Easy','Medium','Hard')) NOT NULL,
      category             TEXT NOT NULL,
      tags                 TEXT NOT NULL DEFAULT '[]',
      description          TEXT NOT NULL,
      examples             TEXT NOT NULL DEFAULT '[]',
      constraints          TEXT,
      solution             TEXT,
      solution_explanation TEXT,
      test_cases           TEXT NOT NULL DEFAULT '[]',
      created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}
