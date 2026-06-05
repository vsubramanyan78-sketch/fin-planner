import { Router } from "express";
import { getDb } from "./db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import fs from "fs";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key_needs_change";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Auth Middleware
function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const dec = jwt.verify(token, JWT_SECRET) as any;
    req.userId = dec.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

router.post("/auth/signup", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  
  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  
  try {
    const stmt = db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)");
    stmt.run(id, email, hash, name);
    const token = jwt.sign({ userId: id }, JWT_SECRET);
    res.json({ token, user: { id, email, name } });
  } catch (err: any) {
    res.status(400).json({ error: "Email might be in use" });
  }
});

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  const user = stmt.get(email) as any;
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.get("/auth/me", authMiddleware, (req: any, res) => {
  const db = getDb();
  const stmt = db.prepare("SELECT id, email, name FROM users WHERE id = ?");
  const user = stmt.get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

router.get("/transactions", authMiddleware, (req: any, res) => {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC");
  const rows = stmt.all(req.userId);
  res.json({ transactions: rows });
});

router.post("/transactions", authMiddleware, (req: any, res) => {
  const { amount, type, category, title, date, is_recurring, recurring_frequency, notes } = req.body;
  const db = getDb();
  const id = uuidv4();
  const stmt = db.prepare("INSERT INTO transactions (id, user_id, amount, type, category, title, date, is_recurring, recurring_frequency, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  stmt.run(
    id,
    req.userId,
    amount,
    type,
    category,
    title,
    date || new Date().toISOString(),
    is_recurring ? 1 : 0,
    recurring_frequency || null,
    notes || null
  );
  res.json({ id });
});

router.get("/budgets", authMiddleware, (req: any, res) => {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM budgets WHERE user_id = ?");
  const rows = stmt.all(req.userId);
  res.json({ budgets: rows });
});

router.post("/budgets", authMiddleware, (req: any, res) => {
  const { category, limit_amount } = req.body;
  const db = getDb();
  const id = uuidv4();
  const stmt = db.prepare("INSERT INTO budgets (id, user_id, category, limit_amount) VALUES (?, ?, ?, ?)");
  stmt.run(id, req.userId, category, limit_amount);
  res.json({ id, category, limit_amount });
});

router.get("/subscriptions", authMiddleware, (req: any, res) => {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?");
  const rows = stmt.all(req.userId);
  res.json({ subscriptions: rows });
});

router.post("/subscriptions", authMiddleware, (req: any, res) => {
  const { name, amount, billing_cycle, next_billing_date } = req.body;
  const db = getDb();
  const id = uuidv4();
  const stmt = db.prepare("INSERT INTO subscriptions (id, user_id, name, amount, billing_cycle, next_billing_date) VALUES (?, ?, ?, ?, ?, ?)");
  stmt.run(id, req.userId, name, amount, billing_cycle, next_billing_date || new Date().toISOString());
  res.json({ id, name, amount, billing_cycle, next_billing_date });
});

router.post("/receipt", authMiddleware, async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No image provided" });
  
  try {
    const data = fs.readFileSync(req.file.path);
    const base64EncodeString = Buffer.from(data).toString("base64");
    
    fs.unlinkSync(req.file.path); // clean up

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: req.file.mimetype,
              data: base64EncodeString,
            },
          },
          { text: "Extract the following details from this receipt: storeName, totalAmount, date, and suggest a category. Return strictly JSON" },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storeName: { type: Type.STRING },
            totalAmount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            category: { type: Type.STRING }
          }
        }
      }
    });

    res.json(JSON.parse(response.text?.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "") || "{}"));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/ai/ask", authMiddleware, async (req: any, res) => {
  const { prompt } = req.body;
  // Let's get user's recent transactions to provide context
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 50");
  const transactions = stmt.all(req.userId);

  const context = `You are an AI Financial Assistant. The user's recent transactions are: ${JSON.stringify(transactions)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: context
      }
    });
    
    res.json({ text: response.text });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
