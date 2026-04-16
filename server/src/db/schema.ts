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
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      color      TEXT NOT NULL DEFAULT '#C3D4B5',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS problems (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      title                TEXT NOT NULL,
      difficulty           TEXT CHECK(difficulty IN ('Easy','Medium','Hard')) NOT NULL,
      category_id          INTEGER NOT NULL REFERENCES categories(id),
      tags                 TEXT NOT NULL DEFAULT '[]',
      description          TEXT NOT NULL,
      examples             TEXT NOT NULL DEFAULT '[]',
      constraints          TEXT,
      solution             TEXT,
      solution_explanation TEXT,
      test_cases           TEXT NOT NULL DEFAULT '[]',
      practice_count       INTEGER NOT NULL DEFAULT 0,
      created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: add practice_count to existing databases
  try {
    db.exec('ALTER TABLE problems ADD COLUMN practice_count INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists — ignore
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_inputs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      topics      TEXT NOT NULL,
      languages   TEXT NOT NULL,
      goal        TEXT NOT NULL,
      job_roles   TEXT,
      job_level   TEXT,
      difficulty  TEXT,
      skill_level INTEGER NOT NULL,
      extra_notes TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_proposals (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      source_input_id      INTEGER NOT NULL REFERENCES ai_inputs(id),
      title                TEXT NOT NULL,
      difficulty           TEXT CHECK(difficulty IN ('Easy','Medium','Hard')) NOT NULL,
      category_id          INTEGER REFERENCES categories(id),
      tags                 TEXT NOT NULL DEFAULT '[]',
      description          TEXT NOT NULL,
      examples             TEXT NOT NULL DEFAULT '[]',
      constraints          TEXT,
      solution             TEXT,
      solution_explanation TEXT,
      test_cases           TEXT NOT NULL DEFAULT '[]',
      language             TEXT NOT NULL DEFAULT 'javascript',
      status               TEXT NOT NULL DEFAULT 'pending',
      created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}
