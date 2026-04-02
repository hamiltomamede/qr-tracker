import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
import { UAParser } from 'ua-parser-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'qr-tracker-secret-key-change-in-production';

const app = express();
app.use(cors());
app.use(express.json());

const dbDir = process.env.DB_PATH || __dirname;
const db = new Database(path.join(dbDir, 'qr-tracker.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_name TEXT NOT NULL,
    destination_url TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    scan_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id TEXT NOT NULL,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip TEXT,
    device TEXT,
    browser TEXT,
    os TEXT,
    is_mobile INTEGER DEFAULT 0,
    is_tablet INTEGER DEFAULT 0,
    is_desktop INTEGER DEFAULT 0,
    FOREIGN KEY (link_id) REFERENCES links(id)
  );
`);

const columnsToAdd = [
  { table: 'links', column: 'user_id', def: 'INTEGER' },
  { table: 'scans', column: 'device', def: 'TEXT' },
  { table: 'scans', column: 'browser', def: 'TEXT' },
  { table: 'scans', column: 'os', def: 'TEXT' },
  { table: 'scans', column: 'is_mobile', def: 'INTEGER DEFAULT 0' },
  { table: 'scans', column: 'is_tablet', def: 'INTEGER DEFAULT 0' },
  { table: 'scans', column: 'is_desktop', def: 'INTEGER DEFAULT 0' },
  { table: 'users', column: 'role', def: "TEXT DEFAULT 'user'" },
  { table: 'users', column: 'name', def: 'TEXT' },
];

columnsToAdd.forEach(({ table, column, def }) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  } catch (e) {}
});

// Create default admin if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)")
    .run('admin@qrtracker.com', hash, 'admin');
  console.log('Default admin created: admin@qrtracker.com / admin123');
}

function parseUA(uaString) {
  const parser = new UAParser(uaString);
  const result = parser.getResult();
  return {
    device: result.device.type || 'desktop',
    browser: result.browser.name || 'Unknown',
    os: result.os.name || 'Unknown',
    is_mobile: result.device.type === 'mobile' ? 1 : 0,
    is_tablet: result.device.type === 'tablet' ? 1 : 0,
    is_desktop: !result.device.type || result.device.type === 'desktop' ? 1 : 0,
  };
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function isAdmin(req, res, next) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// AUTH: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at }, token });
});

// USERS: List (admin only)
app.get('/api/users', authMiddleware, isAdmin, (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// USERS: Create (admin only)
app.post('/api/users', authMiddleware, isAdmin, (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email and password (min 6 chars) required' });
  }
  try {
    const hash = bcrypt.hashSync(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'user';
    const userName = req.body.name || email.split('@')[0];
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(userName, email, hash, userRole);
    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE email = ?').get(email);
    res.status(201).json(user);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// USERS: Delete (admin only)
app.delete('/api/users/:id', authMiddleware, isAdmin, (req, res) => {
  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
    if (adminCount.count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin' });
    }
  }
  db.prepare('DELETE FROM scans WHERE link_id IN (SELECT id FROM links WHERE user_id = ?)').run(req.params.id);
  db.prepare('DELETE FROM links WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

// USERS: Change role (admin only)
app.put('/api/users/:id/role', authMiddleware, isAdmin, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or user' });
  }
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (role === 'user') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
    if (adminCount.count <= 1 && target.id === req.userId) {
      return res.status(400).json({ error: 'Cannot demote the last admin' });
    }
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'Role updated' });
});

// USERS: Update (admin only)
app.put('/api/users/:id', authMiddleware, isAdmin, (req, res) => {
  const { name, role } = req.body;
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (role && !['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or user' });
  }
  if (role === 'user') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
    if (adminCount.count <= 1 && target.id === req.userId) {
      return res.status(400).json({ error: 'Cannot demote the last admin' });
    }
  }
  db.prepare('UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role) WHERE id = ?')
    .run(name || null, role || null, req.params.id);
  res.json({ message: 'User updated' });
});

// USERS: Reset password (admin only)
app.put('/api/users/:id/password', authMiddleware, isAdmin, (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ message: 'Password updated' });
});

// LINKS: Create
app.post('/api/links', authMiddleware, (req, res) => {
  const { company_name, destination_url } = req.body;
  if (!company_name || !destination_url) {
    return res.status(400).json({ error: 'company_name and destination_url are required' });
  }
  const id = nanoid(10);
  const shortCode = nanoid(8);
  const stmt = db.prepare(
    'INSERT INTO links (id, user_id, company_name, destination_url, short_code) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(id, req.userId, company_name, destination_url, shortCode);
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
  res.status(201).json(link);
});

// LINKS: List with search
app.get('/api/links', authMiddleware, (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const searchTerm = search ? `%${search}%` : '%';

  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  const isAdmin = user?.role === 'admin';

  let total, links;
  if (isAdmin) {
    total = db.prepare(
      'SELECT COUNT(*) as count FROM links WHERE company_name LIKE ? OR destination_url LIKE ?'
    ).get(searchTerm, searchTerm);
    links = db.prepare(`
      SELECT l.*, u.email as owner_email FROM links l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.company_name LIKE ? OR l.destination_url LIKE ?
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `).all(searchTerm, searchTerm, parseInt(limit), offset);
  } else {
    total = db.prepare(
      'SELECT COUNT(*) as count FROM links WHERE user_id = ? AND (company_name LIKE ? OR destination_url LIKE ?)'
    ).get(req.userId, searchTerm, searchTerm);
    links = db.prepare(`
      SELECT * FROM links
      WHERE user_id = ? AND (company_name LIKE ? OR destination_url LIKE ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.userId, searchTerm, searchTerm, parseInt(limit), offset);
  }

  res.json({ links, total: total.count, page: parseInt(page), limit: parseInt(limit) });
});

// LINKS: Get single
app.get('/api/links/:id', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  const link = user?.role === 'admin'
    ? db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id)
    : db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!link) return res.status(404).json({ error: 'Link not found' });
  res.json(link);
});

// LINKS: Update
app.put('/api/links/:id', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  const link = user?.role === 'admin'
    ? db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id)
    : db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const { company_name, destination_url } = req.body;
  if (!company_name || !destination_url) {
    return res.status(400).json({ error: 'company_name and destination_url are required' });
  }

  db.prepare(
    'UPDATE links SET company_name = ?, destination_url = ? WHERE id = ?'
  ).run(company_name, destination_url, req.params.id);

  const updated = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// LINKS: Delete
app.delete('/api/links/:id', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  const link = user?.role === 'admin'
    ? db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id)
    : db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!link) return res.status(404).json({ error: 'Link not found' });
  db.prepare('DELETE FROM scans WHERE link_id = ?').run(req.params.id);
  db.prepare('DELETE FROM links WHERE id = ?').run(req.params.id);
  res.json({ message: 'Link deleted' });
});

// QR Code
app.get('/api/qr/:id', authMiddleware, async (req, res) => {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  const link = user?.role === 'admin'
    ? db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id)
    : db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const baseUrl = process.env.BASE_URL || `http://localhost:3001`;
  const scanUrl = `${baseUrl}/s/${link.short_code}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(scanUrl, { width: 300, margin: 2 });
    res.json({ qr_code: qrDataUrl, scan_url: scanUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// QR Code PNG download
app.get('/api/qr/:id/png', authMiddleware, async (req, res) => {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  const link = user?.role === 'admin'
    ? db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id)
    : db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const baseUrl = process.env.BASE_URL || `http://localhost:3001`;
  const scanUrl = `${baseUrl}/s/${link.short_code}`;

  try {
    const buffer = await QRCode.toBuffer(scanUrl, { width: 300, margin: 2, type: 'png' });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="qr-${link.company_name.replace(/\s+/g, '-').toLowerCase()}.png"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code PNG' });
  }
});

// SCAN redirect
app.get('/s/:shortCode', (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE short_code = ?').get(req.params.shortCode);
  if (!link) return res.status(404).send('Link not found');

  const ua = parseUA(req.headers['user-agent'] || '');
  db.prepare(`
    INSERT INTO scans (link_id, user_agent, ip, device, browser, os, is_mobile, is_tablet, is_desktop)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(link.id, req.headers['user-agent'] || '', req.ip || '', ua.device, ua.browser, ua.os, ua.is_mobile, ua.is_tablet, ua.is_desktop);

  db.prepare('UPDATE links SET scan_count = scan_count + 1 WHERE id = ?').run(link.id);
  res.redirect(302, link.destination_url);
});

// Scans history
app.get('/api/links/:id/scans', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  const link = user?.role === 'admin'
    ? db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id)
    : db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const scans = db.prepare(
    'SELECT * FROM scans WHERE link_id = ? ORDER BY scanned_at DESC LIMIT 100'
  ).all(req.params.id);

  res.json({ link, scans });
});

// Analytics
app.get('/api/links/:id/analytics', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  const link = user?.role === 'admin'
    ? db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id)
    : db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const scansByOS = db.prepare(
    'SELECT os, COUNT(*) as count FROM scans WHERE link_id = ? GROUP BY os ORDER BY count DESC'
  ).all(req.params.id);

  const scansByBrowser = db.prepare(
    'SELECT browser, COUNT(*) as count FROM scans WHERE link_id = ? GROUP BY browser ORDER BY count DESC'
  ).all(req.params.id);

  const scansByDevice = db.prepare(`
    SELECT SUM(is_mobile) as mobile, SUM(is_tablet) as tablet, SUM(is_desktop) as desktop
    FROM scans WHERE link_id = ?
  `).get(req.params.id);

  const scansByDay = db.prepare(`
    SELECT DATE(scanned_at) as date, COUNT(*) as count
    FROM scans WHERE link_id = ?
    GROUP BY DATE(scanned_at) ORDER BY date DESC LIMIT 30
  `).all(req.params.id);

  const scansByHour = db.prepare(`
    SELECT CAST(strftime('%H', scanned_at) AS INTEGER) as hour, COUNT(*) as count
    FROM scans WHERE link_id = ? GROUP BY hour ORDER BY hour
  `).all(req.params.id);

  const firstScan = db.prepare(
    'SELECT scanned_at FROM scans WHERE link_id = ? ORDER BY scanned_at ASC LIMIT 1'
  ).get(req.params.id);

  const lastScan = db.prepare(
    'SELECT scanned_at FROM scans WHERE link_id = ? ORDER BY scanned_at DESC LIMIT 1'
  ).get(req.params.id);

  res.json({
    link,
    total_scans: link.scan_count,
    by_os: scansByOS,
    by_browser: scansByBrowser,
    by_device: {
      mobile: scansByDevice?.mobile || 0,
      tablet: scansByDevice?.tablet || 0,
      desktop: scansByDevice?.desktop || 0,
    },
    by_day: scansByDay,
    by_hour: scansByHour,
    first_scan: firstScan?.scanned_at || null,
    last_scan: lastScan?.scanned_at || null,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`QR Tracker backend running on http://localhost:${PORT}`);
});
