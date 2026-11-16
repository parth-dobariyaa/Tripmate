const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, "tripmate.sqlite"));
db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS trips (id INTEGER PRIMARY KEY, name TEXT NOT NULL, destination TEXT NOT NULL, starts_on TEXT, ends_on TEXT, owner_id INTEGER NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS trip_members (trip_id INTEGER NOT NULL REFERENCES trips(id), user_id INTEGER NOT NULL REFERENCES users(id), role TEXT NOT NULL CHECK(role IN ('treasurer','member')), PRIMARY KEY(trip_id,user_id));
CREATE TABLE IF NOT EXISTS wallet_entries (id INTEGER PRIMARY KEY, trip_id INTEGER NOT NULL REFERENCES trips(id), type TEXT NOT NULL CHECK(type IN ('contribution','transfer')), amount_paise INTEGER NOT NULL CHECK(amount_paise > 0), member_id INTEGER NOT NULL REFERENCES users(id), note TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY, trip_id INTEGER NOT NULL REFERENCES trips(id), description TEXT NOT NULL, amount_paise INTEGER NOT NULL CHECK(amount_paise > 0), paid_by INTEGER NOT NULL REFERENCES users(id), category TEXT NOT NULL, spent_on TEXT NOT NULL, notes TEXT, voided_at TEXT);
CREATE TABLE IF NOT EXISTS expense_splits (expense_id INTEGER NOT NULL REFERENCES expenses(id), user_id INTEGER NOT NULL REFERENCES users(id), share_paise INTEGER NOT NULL CHECK(share_paise >= 0), PRIMARY KEY(expense_id,user_id));
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS photos (id INTEGER PRIMARY KEY, trip_id INTEGER NOT NULL REFERENCES trips(id), uploader_id INTEGER NOT NULL REFERENCES users(id), filename TEXT NOT NULL, mime_type TEXT NOT NULL, data TEXT NOT NULL, caption TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`);

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password, stored) {
  const [salt, digest] = stored.split(":");
  return crypto.timingSafeEqual(Buffer.from(digest, "hex"), crypto.scryptSync(password, salt, 64));
}
function seed() {
  if (db.prepare("SELECT COUNT(*) AS count FROM users").get().count) return seedDemoRecords();
  const user = db.prepare("INSERT INTO users (name,email,password_hash) VALUES (?,?,?) RETURNING id").get("Arjun Rao", "arjun@tripmate.local", hashPassword("tripmate"));
  const trip = db.prepare("INSERT INTO trips (name,destination,starts_on,ends_on,owner_id) VALUES (?,?,?,?,?) RETURNING id").get("Goa Escape", "Goa, India", "2025-01-18", "2025-01-22", user.id);
  db.prepare("INSERT INTO trip_members (trip_id,user_id,role) VALUES (?,?,?)").run(trip.id, user.id, "treasurer");
  for (const [name, email] of [["Meera Shah", "meera@tripmate.local"], ["Rohan Kapoor", "rohan@tripmate.local"], ["Diya Menon", "diya@tripmate.local"]]) {
    const member = db.prepare("INSERT INTO users (name,email,password_hash) VALUES (?,?,?) RETURNING id").get(name, email, hashPassword("tripmate"));
    db.prepare("INSERT INTO trip_members (trip_id,user_id,role) VALUES (?,?,?)").run(trip.id, member.id, "member");
  }
  seedDemoRecords();
}
function seedDemoRecords() {
  const trip = db.prepare("SELECT id FROM trips ORDER BY id LIMIT 1").get();
  if (!trip || db.prepare("SELECT COUNT(*) AS count FROM expenses WHERE trip_id=? AND description='Villa by the sea'").get(trip.id).count) return;
  const ids = db.prepare("SELECT user_id FROM trip_members WHERE trip_id=? ORDER BY user_id").all(trip.id).map(x => x.user_id);
  const expenses = [["Villa by the sea", 18600, ids[0], "Stay", "2025-01-18", "Four nights"], ["Airport cabs", 2400, ids[1], "Transport", "2025-01-18", null], ["Beach shack dinner", 3850, ids[2], "Food", "2025-01-19", null], ["Dolphin cruise", 5200, ids[0], "Activities", "2025-01-20", null], ["Local market finds", 1760, ids[3], "Shopping", "2025-01-21", null]];
  for (const [description, amount, paidBy, category, spentOn, notes] of expenses) {
    const expense = db.prepare("INSERT INTO expenses(trip_id,description,amount_paise,paid_by,category,spent_on,notes) VALUES(?,?,?,?,?,?,?) RETURNING id").get(trip.id, description, amount * 100, paidBy, category, spentOn, notes);
    for (const userId of ids) db.prepare("INSERT INTO expense_splits VALUES(?,?,?)").run(expense.id, userId, Math.round(amount * 100 / ids.length));
  }
  for (const [amount, memberId, note] of [[12000, ids[0], "Opening fund"], [10000, ids[1], "Trip contribution"], [10000, ids[2], "Trip contribution"], [10000, ids[3], "Trip contribution"]]) db.prepare("INSERT INTO wallet_entries(trip_id,type,amount_paise,member_id,note) VALUES(?,?,?,?,?)").run(trip.id, "contribution", amount * 100, memberId, note);
}
seed();
module.exports = { db, hashPassword, verifyPassword };
