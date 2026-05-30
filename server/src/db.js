require('dotenv').config();
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});

async function migrate() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'DEPENDENT',
      avatar_color TEXT NOT NULL DEFAULT '#34C759',
      avatar_initials TEXT NOT NULL DEFAULT '?',
      household_id TEXT REFERENCES households(id),
      push_subscription TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT REFERENCES users(id),
      is_shared INTEGER NOT NULL DEFAULT 0,
      qty REAL NOT NULL,
      max_qty REAL NOT NULL,
      unit TEXT NOT NULL,
      price_per_unit REAL NOT NULL DEFAULT 0,
      category TEXT NOT NULL,
      threshold REAL NOT NULL DEFAULT 1,
      household_id TEXT NOT NULL REFERENCES households(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      from_id TEXT NOT NULL REFERENCES users(id),
      resolved_by_id TEXT REFERENCES users(id),
      household_id TEXT NOT NULL REFERENCES households(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  console.log('[db] Tables created/verified');
}

// Row mappers — snake_case → camelCase
function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    avatarColor: row.avatar_color,
    avatarInitials: row.avatar_initials,
    householdId: row.household_id,
    pushSubscription: row.push_subscription,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    isShared: Boolean(row.is_shared),
    qty: row.qty,
    maxQty: row.max_qty,
    unit: row.unit,
    pricePerUnit: row.price_per_unit,
    category: row.category,
    threshold: row.threshold,
    householdId: row.household_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    text: row.text,
    status: row.status,
    fromId: row.from_id,
    resolvedById: row.resolved_by_id,
    householdId: row.household_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHousehold(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
  };
}

// ─── DB helpers ────────────────────────────────────────────

function cuid() {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 10);
  return `c${ts}${rnd}`;
}

// Users
async function findUserByEmail(email) {
  const r = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
  return mapUser(r.rows[0]);
}

async function findUserById(id) {
  const r = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return mapUser(r.rows[0]);
}

async function createUser({ name, email, password, role = 'SHOPPER', avatarColor = '#34C759', avatarInitials = '?', householdId = null }) {
  const id = cuid();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO users (id, name, email, password, role, avatar_color, avatar_initials, household_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, name, email, password, role, avatarColor, avatarInitials, householdId, now, now],
  });
  return findUserById(id);
}

async function updateUser(id, fields) {
  const allowed = ['name', 'role', 'avatar_color', 'avatar_initials', 'household_id', 'push_subscription'];
  const fieldMap = {
    name: 'name',
    role: 'role',
    avatarColor: 'avatar_color',
    avatarInitials: 'avatar_initials',
    householdId: 'household_id',
    pushSubscription: 'push_subscription',
  };
  const sets = [];
  const args = [];
  for (const [k, v] of Object.entries(fields)) {
    const col = fieldMap[k];
    if (col) { sets.push(`${col} = ?`); args.push(v); }
  }
  if (!sets.length) return findUserById(id);
  sets.push(`updated_at = ?`);
  args.push(new Date().toISOString());
  args.push(id);
  await db.execute({ sql: `UPDATE users SET ${sets.join(', ')} WHERE id = ?`, args });
  return findUserById(id);
}

async function getUsersByHousehold(householdId) {
  const r = await db.execute({ sql: 'SELECT * FROM users WHERE household_id = ?', args: [householdId] });
  return r.rows.map(mapUser);
}

// Households
async function createHousehold({ name, inviteCode }) {
  const id = cuid();
  const now = new Date().toISOString();
  await db.execute({
    sql: 'INSERT INTO households (id, name, invite_code, created_at) VALUES (?, ?, ?, ?)',
    args: [id, name, inviteCode || cuid(), now],
  });
  return findHouseholdById(id);
}

async function findHouseholdById(id) {
  const r = await db.execute({ sql: 'SELECT * FROM households WHERE id = ?', args: [id] });
  return mapHousehold(r.rows[0]);
}

async function findHouseholdByInviteCode(code) {
  const r = await db.execute({ sql: 'SELECT * FROM households WHERE invite_code = ?', args: [code] });
  return mapHousehold(r.rows[0]);
}

async function updateHousehold(id, fields) {
  const sets = [];
  const args = [];
  if (fields.name) { sets.push('name = ?'); args.push(fields.name); }
  if (fields.inviteCode) { sets.push('invite_code = ?'); args.push(fields.inviteCode); }
  if (!sets.length) return findHouseholdById(id);
  args.push(id);
  await db.execute({ sql: `UPDATE households SET ${sets.join(', ')} WHERE id = ?`, args });
  return findHouseholdById(id);
}

// Items
async function getItemsByHousehold(householdId) {
  const r = await db.execute({ sql: 'SELECT * FROM items WHERE household_id = ? ORDER BY name', args: [householdId] });
  return r.rows.map(mapItem);
}

async function findItemById(id) {
  const r = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [id] });
  return mapItem(r.rows[0]);
}

async function createItem({ name, ownerId = null, isShared = false, qty, maxQty, unit, pricePerUnit = 0, category, threshold = 1, householdId }) {
  const id = cuid();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO items (id, name, owner_id, is_shared, qty, max_qty, unit, price_per_unit, category, threshold, household_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, name, ownerId, isShared ? 1 : 0, qty, maxQty, unit, pricePerUnit, category, threshold, householdId, now, now],
  });
  return findItemById(id);
}

async function updateItem(id, fields) {
  const fieldMap = {
    name: 'name',
    ownerId: 'owner_id',
    isShared: 'is_shared',
    qty: 'qty',
    maxQty: 'max_qty',
    unit: 'unit',
    pricePerUnit: 'price_per_unit',
    category: 'category',
    threshold: 'threshold',
  };
  const sets = [];
  const args = [];
  for (const [k, v] of Object.entries(fields)) {
    const col = fieldMap[k];
    if (col !== undefined) {
      sets.push(`${col} = ?`);
      args.push(k === 'isShared' ? (v ? 1 : 0) : v);
    }
  }
  if (!sets.length) return findItemById(id);
  sets.push('updated_at = ?');
  args.push(new Date().toISOString());
  args.push(id);
  await db.execute({ sql: `UPDATE items SET ${sets.join(', ')} WHERE id = ?`, args });
  return findItemById(id);
}

async function deleteItem(id) {
  await db.execute({ sql: 'DELETE FROM items WHERE id = ?', args: [id] });
}

// Requests
async function getRequestsByHousehold(householdId) {
  const r = await db.execute({
    sql: 'SELECT * FROM requests WHERE household_id = ? ORDER BY created_at DESC',
    args: [householdId],
  });
  const reqs = r.rows.map(mapRequest);
  // Attach from/resolvedBy users
  for (const req of reqs) {
    req.from = await findUserById(req.fromId).then(u => u ? {
      id: u.id, name: u.name, avatarInitials: u.avatarInitials, avatarColor: u.avatarColor
    } : null);
    req.resolvedBy = req.resolvedById ? await findUserById(req.resolvedById).then(u => u ? { id: u.id, name: u.name } : null) : null;
  }
  return reqs;
}

async function findRequestById(id) {
  const r = await db.execute({ sql: 'SELECT * FROM requests WHERE id = ?', args: [id] });
  return mapRequest(r.rows[0]);
}

async function createRequest({ text, fromId, householdId }) {
  const id = cuid();
  const now = new Date().toISOString();
  await db.execute({
    sql: 'INSERT INTO requests (id, text, from_id, household_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, text, fromId, householdId, now, now],
  });
  const req = await findRequestById(id);
  req.from = await findUserById(fromId).then(u => u ? {
    id: u.id, name: u.name, avatarInitials: u.avatarInitials, avatarColor: u.avatarColor
  } : null);
  req.resolvedBy = null;
  return req;
}

async function updateRequest(id, { status, resolvedById }) {
  const now = new Date().toISOString();
  await db.execute({
    sql: 'UPDATE requests SET status = ?, resolved_by_id = ?, updated_at = ? WHERE id = ?',
    args: [status, resolvedById, now, id],
  });
  const req = await findRequestById(id);
  req.from = await findUserById(req.fromId).then(u => u ? {
    id: u.id, name: u.name, avatarInitials: u.avatarInitials, avatarColor: u.avatarColor
  } : null);
  req.resolvedBy = resolvedById ? await findUserById(resolvedById).then(u => u ? { id: u.id, name: u.name } : null) : null;
  return req;
}

// Refresh tokens
async function createRefreshToken({ token, userId, expiresAt }) {
  const id = cuid();
  const now = new Date().toISOString();
  await db.execute({
    sql: 'INSERT INTO refresh_tokens (id, token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [id, token, userId, expiresAt.toISOString(), now],
  });
}

async function findRefreshToken(tokenHash) {
  const r = await db.execute({ sql: 'SELECT * FROM refresh_tokens WHERE token = ?', args: [tokenHash] });
  return r.rows[0] ? {
    id: r.rows[0].id,
    token: r.rows[0].token,
    userId: r.rows[0].user_id,
    expiresAt: new Date(r.rows[0].expires_at),
  } : null;
}

async function deleteRefreshToken(tokenHash) {
  await db.execute({ sql: 'DELETE FROM refresh_tokens WHERE token = ?', args: [tokenHash] });
}

async function deleteUserRefreshTokens(userId) {
  await db.execute({ sql: 'DELETE FROM refresh_tokens WHERE user_id = ?', args: [userId] });
}

module.exports = {
  db, migrate, cuid,
  findUserByEmail, findUserById, createUser, updateUser, getUsersByHousehold,
  createHousehold, findHouseholdById, findHouseholdByInviteCode, updateHousehold,
  getItemsByHousehold, findItemById, createItem, updateItem, deleteItem,
  getRequestsByHousehold, findRequestById, createRequest, updateRequest,
  createRefreshToken, findRefreshToken, deleteRefreshToken, deleteUserRefreshTokens,
};
