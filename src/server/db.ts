import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = path.resolve(process.cwd(), "fintech.db");

let db: Database.Database;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
  }
  return db;
}

export default function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      amount REAL,
      type TEXT, -- 'income' or 'expense'
      category TEXT,
      title TEXT,
      date TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurring_frequency TEXT,
      notes TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      category TEXT,
      limit_amount REAL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT,
      amount REAL,
      billing_cycle TEXT, -- 'monthly', 'yearly'
      next_billing_date TEXT,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // Migrate existing transactions table if the columns do not exist
  try {
    db.exec("ALTER TABLE transactions ADD COLUMN is_recurring INTEGER DEFAULT 0;");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE transactions ADD COLUMN recurring_frequency TEXT;");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE transactions ADD COLUMN notes TEXT;");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE subscriptions ADD COLUMN is_active INTEGER DEFAULT 1;");
  } catch (e) {}
}
