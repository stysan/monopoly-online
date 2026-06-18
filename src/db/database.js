const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'monopoly.db');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let db; // sql.js Database instance

// ─── Sync save helper ─────────────────────────────────────────────
function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ─── Init (returns promise) ───────────────────────────────────────
async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT DEFAULT 'top-hat',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      last_login INTEGER,
      is_online INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id INTEGER PRIMARY KEY,
      games_played INTEGER DEFAULT 0,
      games_won INTEGER DEFAULT 0,
      total_money_earned INTEGER DEFAULT 0,
      total_properties_bought INTEGER DEFAULT 0,
      total_rent_collected INTEGER DEFAULT 0,
      total_rent_paid INTEGER DEFAULT 0,
      longest_game_minutes INTEGER DEFAULT 0,
      bankrupt_count INTEGER DEFAULT 0,
      monopolies_formed INTEGER DEFAULT 0,
      hotels_built INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      winner_id INTEGER,
      duration_minutes INTEGER DEFAULT 0,
      player_count INTEGER DEFAULT 2,
      ended_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS game_participants (
      game_id TEXT NOT NULL,
      user_id INTEGER,
      final_net_worth INTEGER DEFAULT 0,
      placement INTEGER DEFAULT 0,
      PRIMARY KEY (game_id, user_id)
    );
  `);
  saveDb();
  console.log('[DB] Initialized at', DB_PATH);
}

// ─── Query helpers ────────────────────────────────────────────────
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

// ─── Users ───────────────────────────────────────────────────────
function createUser(username, password, avatar = 'top-hat') {
  const existing = queryOne('SELECT id FROM users WHERE lower(username) = lower(?)', [username]);
  if (existing) return { success: false, error: 'Username already taken' };
  const hash = bcrypt.hashSync(password, 10);
  try {
    run('INSERT INTO users (username, password_hash, avatar) VALUES (?, ?, ?)', [username, hash, avatar]);
    const user = queryOne('SELECT id FROM users WHERE lower(username) = lower(?)', [username]);
    run('INSERT INTO user_stats (user_id) VALUES (?)', [user.id]);
    return { success: true, id: user.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function verifyUser(username, password) {
  const user = queryOne('SELECT * FROM users WHERE lower(username) = lower(?)', [username]);
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  run('UPDATE users SET last_login = strftime(\'%s\',\'now\'), is_online = 1 WHERE id = ?', [user.id]);
  return { id: user.id, username: user.username, avatar: user.avatar };
}

function getUserById(id) {
  return queryOne('SELECT id, username, avatar, created_at FROM users WHERE id = ?', [id]);
}

function setUserOnline(id, online) {
  run('UPDATE users SET is_online = ? WHERE id = ?', [online ? 1 : 0, id]);
}

function getOnlineCount() {
  const r = queryOne('SELECT COUNT(*) as cnt FROM users WHERE is_online = 1');
  return r ? r.cnt : 0;
}

// ─── Stats ───────────────────────────────────────────────────────
function getUserStats(userId) {
  const user = queryOne('SELECT id, username, avatar, created_at FROM users WHERE id = ?', [userId]);
  const stats = queryOne('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
  if (!user || !stats) return null;
  const winRate = stats.games_played > 0 ? Math.round((stats.games_won / stats.games_played) * 100) : 0;
  return { ...user, ...stats, win_rate: winRate };
}

function getUserStatsByUsername(username) {
  const user = queryOne('SELECT id FROM users WHERE lower(username) = lower(?)', [username]);
  if (!user) return null;
  return getUserStats(user.id);
}

function updateStatsAfterGame(gameId, results) {
  for (const r of results) {
    if (!r.userId) continue;
    run(`UPDATE user_stats SET
      games_played = games_played + 1,
      games_won = games_won + ?,
      total_money_earned = total_money_earned + ?,
      total_properties_bought = total_properties_bought + ?,
      total_rent_collected = total_rent_collected + ?,
      total_rent_paid = total_rent_paid + ?,
      longest_game_minutes = MAX(longest_game_minutes, ?),
      bankrupt_count = bankrupt_count + ?,
      monopolies_formed = monopolies_formed + ?,
      hotels_built = hotels_built + ?
      WHERE user_id = ?`,
      [r.won ? 1 : 0, r.moneyEarned||0, r.propertiesBought||0,
       r.rentCollected||0, r.rentPaid||0, r.durationMinutes||0,
       r.bankrupt ? 1 : 0, r.monopolies||0, r.hotels||0, r.userId]);
    try {
      run('INSERT OR REPLACE INTO game_participants (game_id, user_id, final_net_worth, placement) VALUES (?,?,?,?)',
        [gameId, r.userId, r.netWorth||0, r.placement||0]);
    } catch(e) {}
  }
}

function saveGameHistory(gameId, winnerId, durationMinutes, playerCount) {
  try {
    run('INSERT OR IGNORE INTO game_history (game_id, winner_id, duration_minutes, player_count) VALUES (?,?,?,?)',
      [gameId, winnerId, durationMinutes, playerCount]);
  } catch(e) {}
}

// ─── Leaderboards ────────────────────────────────────────────────
function getLeaderboard(type = 'wins', limit = 20) {
  const queries = {
    wins: `SELECT u.username, u.avatar, s.games_won as score, s.games_played,
             CASE WHEN s.games_played > 0 THEN ROUND(s.games_won * 100.0 / s.games_played) ELSE 0 END as win_rate
           FROM users u JOIN user_stats s ON u.id = s.user_id
           WHERE s.games_played >= 1 ORDER BY s.games_won DESC, win_rate DESC LIMIT ${limit}`,
    winrate: `SELECT u.username, u.avatar,
               CASE WHEN s.games_played>0 THEN ROUND(s.games_won*100.0/s.games_played) ELSE 0 END as score,
               s.games_played, s.games_won as wins
             FROM users u JOIN user_stats s ON u.id = s.user_id
             WHERE s.games_played >= 3 ORDER BY score DESC, s.games_won DESC LIMIT ${limit}`,
    richest: `SELECT u.username, u.avatar, s.total_money_earned as score, s.games_played,
               CASE WHEN s.games_played>0 THEN ROUND(s.games_won*100.0/s.games_played) ELSE 0 END as win_rate
             FROM users u JOIN user_stats s ON u.id = s.user_id
             WHERE s.games_played >= 1 ORDER BY s.total_money_earned DESC LIMIT ${limit}`,
    landlord: `SELECT u.username, u.avatar, s.total_properties_bought as score, s.games_played,
                CASE WHEN s.games_played>0 THEN ROUND(s.games_won*100.0/s.games_played) ELSE 0 END as win_rate
              FROM users u JOIN user_stats s ON u.id = s.user_id
              WHERE s.games_played >= 1 ORDER BY s.total_properties_bought DESC LIMIT ${limit}`,
    rentking: `SELECT u.username, u.avatar, s.total_rent_collected as score, s.games_played,
                CASE WHEN s.games_played>0 THEN ROUND(s.games_won*100.0/s.games_played) ELSE 0 END as win_rate
              FROM users u JOIN user_stats s ON u.id = s.user_id
              WHERE s.games_played >= 1 ORDER BY s.total_rent_collected DESC LIMIT ${limit}`
  };
  return queryAll(queries[type] || queries.wins);
}

module.exports = {
  initDb,
  createUser, verifyUser, getUserById, setUserOnline, getOnlineCount,
  getUserStats, getUserStatsByUsername, updateStatsAfterGame, saveGameHistory,
  getLeaderboard
};
