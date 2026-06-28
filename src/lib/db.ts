import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_DIR = process.env.DATABASE_PATH
  ? path.dirname(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'data');
const DB_PATH = process.env.DATABASE_PATH ?? path.join(DB_DIR, 'app.db');

let db: Database.Database | null = null;

export interface OAuthTokens {
  user_email: string;
  access_token: string;
  refresh_token: string;
  expiry: number;
}

export interface Summary {
  id: number;
  date: string;
  content: string;
  email_count: number;
  created_at: string;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      user_email TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expiry INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      email_count INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }

  return db;
}

export function saveTokens(tokens: OAuthTokens): void {
  getDb()
    .prepare(
      `
      INSERT INTO oauth_tokens (user_email, access_token, refresh_token, expiry)
      VALUES (@user_email, @access_token, @refresh_token, @expiry)
      ON CONFLICT(user_email) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expiry = excluded.expiry
    `,
    )
    .run(tokens);
}

export function getTokens(userEmail?: string): OAuthTokens | null {
  const database = getDb();

  if (userEmail) {
    const row = database
      .prepare('SELECT user_email, access_token, refresh_token, expiry FROM oauth_tokens WHERE user_email = ?')
      .get(userEmail) as OAuthTokens | undefined;
    return row ?? null;
  }

  const row = database
    .prepare('SELECT user_email, access_token, refresh_token, expiry FROM oauth_tokens LIMIT 1')
    .get() as OAuthTokens | undefined;

  return row ?? null;
}

export function deleteTokens(userEmail?: string): void {
  const database = getDb();

  if (userEmail) {
    database
      .prepare('DELETE FROM oauth_tokens WHERE user_email = ?')
      .run(userEmail);
    return;
  }

  database.prepare('DELETE FROM oauth_tokens').run();
}

export function saveSummary(
  date: string,
  content: string,
  emailCount: number,
): Summary {
  getDb()
    .prepare(
      `
      INSERT INTO summaries (date, content, email_count)
      VALUES (@date, @content, @email_count)
      ON CONFLICT(date) DO UPDATE SET
        content = excluded.content,
        email_count = excluded.email_count,
        created_at = datetime('now')
    `,
    )
    .run({ date, content, email_count: emailCount });

  return getSummaryByDate(date)!;
}

export function getSummaries(limit = 30): Summary[] {
  return getDb()
    .prepare(
      `
      SELECT id, date, content, email_count, created_at
      FROM summaries
      ORDER BY date DESC
      LIMIT ?
    `,
    )
    .all(limit) as Summary[];
}

export function getSummaryByDate(date: string): Summary | null {
  const row = getDb()
    .prepare(
      `
      SELECT id, date, content, email_count, created_at
      FROM summaries
      WHERE date = ?
    `,
    )
    .get(date) as Summary | undefined;

  return row ?? null;
}
