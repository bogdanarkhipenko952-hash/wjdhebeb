import Database from 'better-sqlite3';
import { join } from 'path';

const db = new Database('pulse.db');

// Optimize SQLite for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB cache
db.pragma('temp_store = MEMORY');
db.pragma('mmap_size = 30000000000'); // Use memory mapping

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    two_factor_code TEXT,
    name TEXT,
    avatar TEXT,
    bio TEXT,
    phone_number TEXT,
    balance INTEGER DEFAULT 2500,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    receiver_id TEXT,
    content TEXT,
    type TEXT DEFAULT 'text',
    media_url TEXT,
    amount REAL,
    currency TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS gifts (
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    name TEXT,
    image_url TEXT,
    collection TEXT,
    description TEXT,
    date TEXT,
    number INTEGER,
    total_issued INTEGER,
    is_pinned BOOLEAN DEFAULT 0,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    media_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    contact_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(contact_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    contact_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(contact_id) REFERENCES users(id),
    UNIQUE(user_id, contact_id)
  );
`);

// Migrations
try {
  db.prepare('ALTER TABLE messages ADD COLUMN amount REAL').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE messages ADD COLUMN currency TEXT').run();
} catch (e) {}

export default db;
