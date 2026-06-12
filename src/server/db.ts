import fs from "fs";
import path from "path";
import { createRequire } from "module";

const dbPath = path.resolve(process.cwd(), "fintech.db");

interface DbStore {
  users: any[];
  transactions: any[];
  budgets: any[];
  subscriptions: any[];
}

const dbStore: DbStore = {
  users: [],
  transactions: [],
  budgets: [],
  subscriptions: []
};

// Seed some initial data to the fallback memory DB so it doesn't look empty when running under Vercel
dbStore.transactions = [
  { id: "tx_1", user_id: "demo", amount: 1200.00, type: "income", category: "salary", title: "Monthly Tech Salary", date: "2026-06-01", is_recurring: 1, recurring_frequency: "monthly", notes: "Core income node", tags: '["salary","deposits"]' },
  { id: "tx_2", user_id: "demo", amount: 15.99, type: "expense", category: "subscriptions", title: "NeuroSynth AI Music", date: "2026-06-03", is_recurring: 1, recurring_frequency: "monthly", notes: "AI music generator subscription", tags: '["entertainment","music"]' },
  { id: "tx_3", user_id: "demo", amount: 35.50, type: "expense", category: "food", title: "Cortex Fuel coffee", date: "2026-06-05", is_recurring: 0, recurring_frequency: null, notes: "Weekly coffee run", tags: '["coffee","food"]' },
  { id: "tx_4", user_id: "demo", amount: 450.00, type: "expense", category: "rent", title: "Cyber Apartment Rent", date: "2026-06-01", is_recurring: 1, recurring_frequency: "monthly", notes: "Base node habitat rent", tags: '["rent","living"]' }
];

dbStore.budgets = [
  { id: "b_1", user_id: "demo", category: "food", limit_amount: 300.00 },
  { id: "b_2", user_id: "demo", category: "subscriptions", limit_amount: 100.00 },
  { id: "b_3", user_id: "demo", category: "rent", limit_amount: 1000.00 }
];

dbStore.subscriptions = [
  { id: "sub_1", user_id: "demo", name: "NeuroSynth AI Music", amount: 15.99, billing_cycle: "monthly", next_billing_date: "2026-07-03", is_active: 1 },
  { id: "sub_2", user_id: "demo", name: "CyberGrid Hosting Node", amount: 45.00, billing_cycle: "monthly", next_billing_date: "2026-07-15", is_active: 1 }
];

dbStore.users = [
  { id: "demo", email: "demo@neurofin.ai", password_hash: "$2s$10$UnV6N5g3z39bY.T0Dk0n9un1E0O9nO.o.UnV6N5g3z39", name: "Demo User", created_at: "2026-06-01T00:00:00.000Z" }
];

function createMemoryDbFallback() {
  console.log("Memory DB Fallback loaded and active.");
  return {
    exec: (sql: string) => {
      return {};
    },
    prepare: (sql: string) => {
      const sqlNormalized = sql.trim().replace(/\s+/g, " ");
      
      return {
        run: (...args: any[]) => {
          if (sqlNormalized.startsWith("INSERT INTO users")) {
            const [id, email, password_hash, name] = args;
            dbStore.users.push({ id, email, password_hash, name, created_at: new Date().toISOString() });
            return { changes: 1, lastInsertRowid: id };
          }
          
          if (sqlNormalized.startsWith("INSERT INTO transactions")) {
            const [id, user_id, amount, type, category, title, date, is_recurring, recurring_frequency, notes, tags] = args;
            dbStore.transactions.push({ id, user_id, amount, type, category, title, date, is_recurring, recurring_frequency, notes, tags });
            return { changes: 1, lastInsertRowid: id };
          }
          
          if (sqlNormalized.startsWith("INSERT INTO budgets")) {
            const [id, user_id, category, limit_amount] = args;
            dbStore.budgets.push({ id, user_id, category, limit_amount });
            return { changes: 1, lastInsertRowid: id };
          }
          
          if (sqlNormalized.startsWith("INSERT INTO subscriptions")) {
            const [id, user_id, name, amount, billing_cycle, next_billing_date, is_active] = args;
            dbStore.subscriptions.push({ id, user_id, name, amount, billing_cycle, next_billing_date, is_active: is_active ?? 1 });
            return { changes: 1, lastInsertRowid: id };
          }

          if (sqlNormalized.includes("DELETE FROM transactions")) {
            const userId = args[0];
            const idsToDelete = args.slice(1);
            dbStore.transactions = dbStore.transactions.filter(t => !(t.user_id === userId && idsToDelete.includes(t.id)));
            return { changes: idsToDelete.length };
          }

          if (sqlNormalized.includes("UPDATE transactions SET category = ?")) {
            const category = args[0];
            const userId = args[1];
            const idsToUpdate = args.slice(2);
            dbStore.transactions = dbStore.transactions.map(t => {
              if (t.user_id === userId && idsToUpdate.includes(t.id)) {
                return { ...t, category };
              }
              return t;
            });
            return { changes: idsToUpdate.length };
          }

          if (sqlNormalized.includes("DELETE FROM subscriptions")) {
            const [id, userId] = args;
            dbStore.subscriptions = dbStore.subscriptions.filter(s => !(s.id === id && s.user_id === userId));
            return { changes: 1 };
          }

          return { changes: 0 };
        },

        get: (...args: any[]) => {
          if (sqlNormalized.includes("FROM users WHERE email = ?")) {
            const [email] = args;
            return dbStore.users.find(u => u.email === email) || null;
          }
          
          if (sqlNormalized.includes("FROM users WHERE id = ?")) {
            const [id] = args;
            return dbStore.users.find(u => u.id === id) || null;
          }

          if (sqlNormalized.includes("FROM subscriptions WHERE id = ?")) {
            const [id, userId] = args;
            return dbStore.subscriptions.find(s => s.id === id && s.user_id === userId) || null;
          }

          return null;
        },

        all: (...args: any[]) => {
          const userId = args[0];
          
          if (sqlNormalized.includes("FROM transactions")) {
            let res = dbStore.transactions.filter(t => t.user_id === userId);
            res.sort((a,b) => b.date.localeCompare(a.date));
            if (sqlNormalized.includes("LIMIT 50") || sqlNormalized.includes("LIMIT 100")) {
              const limit = sqlNormalized.includes("LIMIT 50") ? 50 : 100;
              res = res.slice(0, limit);
            }
            return res;
          }

          if (sqlNormalized.includes("FROM budgets")) {
            return dbStore.budgets.filter(b => b.user_id === userId);
          }

          if (sqlNormalized.includes("FROM subscriptions")) {
            return dbStore.subscriptions.filter(s => s.user_id === userId);
          }

          return [];
        }
      };
    }
  };
}

let db: any = null;

export function getDb() {
  if (!db) {
    try {
      const require = createRequire(import.meta.url);
      const Database = require("better-sqlite3");
      db = new Database(dbPath);
    } catch (err) {
      console.warn("better-sqlite3 failed to load. Initializing fallback memory database.", err);
      db = createMemoryDbFallback();
    }
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
    db.exec("ALTER TABLE transactions ADD COLUMN tags TEXT;");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE subscriptions ADD COLUMN is_active INTEGER DEFAULT 1;");
  } catch (e) {}
}

