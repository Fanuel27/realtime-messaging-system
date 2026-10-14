const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

let currentDb = null;

function initDb(customPath = null) {
  const dbPath = customPath || config.DB_PATH;
  const db = new DatabaseSync(dbPath);

  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    try {
      db.exec('PRAGMA journal_mode = WAL;');
    } catch {
      // WAL pragma might fail in certain memory or restricted environments
    }
  }

  // Schema initialization
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, created_at);
  `);

  currentDb = db;
  return db;
}

function getDb() {
  if (!currentDb) {
    initDb();
  }
  return currentDb;
}

// User operations
function createUser(username, email, passwordHash) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
  );
  const result = stmt.run(username.trim(), email.trim().toLowerCase(), passwordHash);
  const id = Number(result.lastInsertRowid);
  return findUserById(id);
}

function findUserByEmail(email) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE');
  return stmt.get(email.trim().toLowerCase());
}

function findUserByUsername(username) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
  return stmt.get(username.trim());
}

function findUserById(id) {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT id, username, email, created_at FROM users WHERE id = ?'
  );
  return stmt.get(id);
}

function checkDuplicateUser(username, email) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
      CASE WHEN username = ? COLLATE NOCASE THEN 1 ELSE 0 END as duplicate_username,
      CASE WHEN email = ? COLLATE NOCASE THEN 1 ELSE 0 END as duplicate_email
    FROM users 
    WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE
    LIMIT 1
  `);
  return stmt.get(username.trim(), email.trim().toLowerCase(), username.trim(), email.trim().toLowerCase());
}

function getAllUsersExcept(currentUserId) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, username, email, created_at 
    FROM users 
    WHERE id != ? 
    ORDER BY username ASC
  `);
  return stmt.all(currentUserId);
}

// Message operations
function createMessage(senderId, recipientId, content) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO messages (sender_id, recipient_id, content) VALUES (?, ?, ?)'
  );
  const result = stmt.run(senderId, recipientId, content.trim());
  const id = Number(result.lastInsertRowid);
  const fetchStmt = db.prepare(`
    SELECT id, sender_id, recipient_id, content, created_at 
    FROM messages 
    WHERE id = ?
  `);
  return fetchStmt.get(id);
}

function getConversationMessages(user1Id, user2Id, limit = 100, offset = 0) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, sender_id, recipient_id, content, created_at
    FROM messages
    WHERE (sender_id = ? AND recipient_id = ?) 
       OR (sender_id = ? AND recipient_id = ?)
    ORDER BY created_at ASC, id ASC
    LIMIT ? OFFSET ?
  `);
  return stmt.all(user1Id, user2Id, user2Id, user1Id, limit, offset);
}

module.exports = {
  initDb,
  getDb,
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  checkDuplicateUser,
  getAllUsersExcept,
  createMessage,
  getConversationMessages,
};
