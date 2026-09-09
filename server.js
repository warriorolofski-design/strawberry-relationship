const express = require("express");
const multer = require("multer");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";

async function init() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Add a PostgreSQL database in Railway.");
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS answers (
      id BIGSERIAL PRIMARY KEY,
      session_id TEXT NOT NULL,
      question_key TEXT NOT NULL,
      question_text TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
init().catch(console.error);

function admin(req, res, next) {
  const supplied = req.headers["x-admin-password"] || req.body?.password || req.query?.password;
  if (supplied !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
  next();
}

app.post("/api/answer", async (req, res) => {
  const { sessionId, questionKey, questionText, answer } = req.body;
  if (!sessionId || !questionKey || !questionText || !answer) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    await pool.query(
      `INSERT INTO answers (session_id, question_key, question_text, answer)
       VALUES ($1,$2,$3,$4)`,
      [sessionId, questionKey, questionText, answer]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/admin/answers", admin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, session_id, question_key, question_text, answer, created_at
      FROM answers ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/admin/photos", admin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT key, value FROM settings WHERE key LIKE 'photo_%' ORDER BY key
    `);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/admin/photo", admin, upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No photo" });
  const key = "photo_" + Date.now();
  const data = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  try {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1,$2)`,
      [key, data]
    );
    res.json({ ok: true, key });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/photos", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT key, value FROM settings WHERE key LIKE 'photo_%' ORDER BY key
    `);
    res.json(result.rows.map(r => r.value));
  } catch (e) {
    res.json([]);
  }
});

app.get("*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
