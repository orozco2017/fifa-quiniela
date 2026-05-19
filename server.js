const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fifa2026quiniela_dev_secret_change_in_prod';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── DATABASE SETUP ───────────────────────────────────────────────────────────

const db = new Database(process.env.DB_PATH || './quiniela.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL,
    matchday INTEGER NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_flag TEXT DEFAULT '',
    away_flag TEXT DEFAULT '',
    game_date TEXT NOT NULL,
    venue TEXT DEFAULT '',
    home_score INTEGER,
    away_score INTEGER,
    status TEXT DEFAULT 'upcoming'
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_id INTEGER NOT NULL,
    home_score INTEGER NOT NULL,
    away_score INTEGER NOT NULL,
    points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (game_id) REFERENCES games(id),
    UNIQUE (user_id, game_id)
  );
`);

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('Admin2026!', 10);
  db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run('admin', hash, 'Administrador', 'admin');
  console.log('✅ Usuario admin creado: admin / Admin2026!');
}

const gamesCount = db.prepare('SELECT COUNT(*) as c FROM games').get();
if (gamesCount.c === 0) {
  const GAMES = [
    // ── GRUPO A: México, Jamaica, Venezuela, El Salvador ──────────────────────
    { g:'A', md:1, home:'México',      away:'Jamaica',      hf:'🇲🇽', af:'🇯🇲', date:'2026-06-11T19:00:00', venue:'SoFi Stadium, Los Ángeles',          hs:2,    as:0,    st:'completed' },
    { g:'A', md:1, home:'Venezuela',   away:'El Salvador',  hf:'🇻🇪', af:'🇸🇻', date:'2026-06-11T22:00:00', venue:'Rose Bowl, Pasadena',                hs:1,    as:1,    st:'completed' },
    { g:'A', md:2, home:'México',      away:'Venezuela',    hf:'🇲🇽', af:'🇻🇪', date:'2026-06-16T22:00:00', venue:'SoFi Stadium, Los Ángeles',          hs:null, as:null, st:'upcoming' },
    { g:'A', md:2, home:'Jamaica',     away:'El Salvador',  hf:'🇯🇲', af:'🇸🇻', date:'2026-06-17T19:00:00', venue:'MetLife Stadium, Nueva York',        hs:null, as:null, st:'upcoming' },
    { g:'A', md:3, home:'El Salvador', away:'México',       hf:'🇸🇻', af:'🇲🇽', date:'2026-06-25T22:00:00', venue:'Estadio Azteca, Ciudad de México',   hs:null, as:null, st:'upcoming' },
    { g:'A', md:3, home:'Jamaica',     away:'Venezuela',    hf:'🇯🇲', af:'🇻🇪', date:'2026-06-25T22:00:00', venue:'AT&T Stadium, Dallas',               hs:null, as:null, st:'upcoming' },

    // ── GRUPO B: USA, Panamá, Honduras, Canadá ────────────────────────────────
    { g:'B', md:1, home:'USA',         away:'Panamá',       hf:'🇺🇸', af:'🇵🇦', date:'2026-06-12T19:00:00', venue:'MetLife Stadium, Nueva York',        hs:2,    as:1,    st:'completed' },
    { g:'B', md:1, home:'Honduras',    away:'Canadá',       hf:'🇭🇳', af:'🇨🇦', date:'2026-06-12T22:00:00', venue:'AT&T Stadium, Dallas',               hs:0,    as:0,    st:'completed' },
    { g:'B', md:2, home:'USA',         away:'Honduras',     hf:'🇺🇸', af:'🇭🇳', date:'2026-06-17T22:00:00', venue:"Levi's Stadium, San Francisco",      hs:null, as:null, st:'upcoming' },
    { g:'B', md:2, home:'Canadá',      away:'Panamá',       hf:'🇨🇦', af:'🇵🇦', date:'2026-06-18T19:00:00', venue:'BMO Field, Toronto',                 hs:null, as:null, st:'upcoming' },
    { g:'B', md:3, home:'Panamá',      away:'USA',          hf:'🇵🇦', af:'🇺🇸', date:'2026-06-26T19:00:00', venue:'Hard Rock Stadium, Miami',           hs:null, as:null, st:'upcoming' },
    { g:'B', md:3, home:'Canadá',      away:'Honduras',     hf:'🇨🇦', af:'🇭🇳', date:'2026-06-26T19:00:00', venue:'BC Place, Vancouver',                hs:null, as:null, st:'upcoming' },

    // ── GRUPO C: Argentina, Chile, Perú, Paraguay ─────────────────────────────
    { g:'C', md:1, home:'Argentina',   away:'Chile',        hf:'🇦🇷', af:'🇨🇱', date:'2026-06-12T22:00:00', venue:'Hard Rock Stadium, Miami',           hs:3,    as:0,    st:'completed' },
    { g:'C', md:1, home:'Perú',        away:'Paraguay',     hf:'🇵🇪', af:'🇵🇾', date:'2026-06-13T19:00:00', venue:'NRG Stadium, Houston',               hs:2,    as:1,    st:'completed' },
    { g:'C', md:2, home:'Argentina',   away:'Perú',         hf:'🇦🇷', af:'🇵🇪', date:'2026-06-18T22:00:00', venue:'MetLife Stadium, Nueva York',        hs:null, as:null, st:'upcoming' },
    { g:'C', md:2, home:'Paraguay',    away:'Chile',        hf:'🇵🇾', af:'🇨🇱', date:'2026-06-19T19:00:00', venue:'Arrowhead Stadium, Kansas City',     hs:null, as:null, st:'upcoming' },
    { g:'C', md:3, home:'Chile',       away:'Argentina',    hf:'🇨🇱', af:'🇦🇷', date:'2026-06-25T19:00:00', venue:'SoFi Stadium, Los Ángeles',          hs:null, as:null, st:'upcoming' },
    { g:'C', md:3, home:'Paraguay',    away:'Perú',         hf:'🇵🇾', af:'🇵🇪', date:'2026-06-25T19:00:00', venue:'Estadio Azteca, Ciudad de México',   hs:null, as:null, st:'upcoming' },

    // ── GRUPO D: Brasil, Uruguay, Ecuador, Bolivia ────────────────────────────
    { g:'D', md:1, home:'Brasil',      away:'Uruguay',      hf:'🇧🇷', af:'🇺🇾', date:'2026-06-13T19:00:00', venue:"Levi's Stadium, San Francisco",      hs:2,    as:0,    st:'completed' },
    { g:'D', md:1, home:'Ecuador',     away:'Bolivia',      hf:'🇪🇨', af:'🇧🇴', date:'2026-06-13T22:00:00', venue:'Arrowhead Stadium, Kansas City',     hs:1,    as:0,    st:'completed' },
    { g:'D', md:2, home:'Brasil',      away:'Ecuador',      hf:'🇧🇷', af:'🇪🇨', date:'2026-06-19T22:00:00', venue:'AT&T Stadium, Dallas',               hs:null, as:null, st:'upcoming' },
    { g:'D', md:2, home:'Uruguay',     away:'Bolivia',      hf:'🇺🇾', af:'🇧🇴', date:'2026-06-20T19:00:00', venue:'NRG Stadium, Houston',               hs:null, as:null, st:'upcoming' },
    { g:'D', md:3, home:'Bolivia',     away:'Brasil',       hf:'🇧🇴', af:'🇧🇷', date:'2026-06-26T22:00:00', venue:'Hard Rock Stadium, Miami',           hs:null, as:null, st:'upcoming' },
    { g:'D', md:3, home:'Ecuador',     away:'Uruguay',      hf:'🇪🇨', af:'🇺🇾', date:'2026-06-26T22:00:00', venue:'MetLife Stadium, Nueva York',        hs:null, as:null, st:'upcoming' },

    // ── GRUPO E: Francia, Bélgica, Polonia, Albania ───────────────────────────
    { g:'E', md:1, home:'Francia',     away:'Bélgica',      hf:'🇫🇷', af:'🇧🇪', date:'2026-06-14T16:00:00', venue:'Lincoln Financial Field, Filadelfia',hs:1,    as:0,    st:'completed' },
    { g:'E', md:1, home:'Polonia',     away:'Albania',      hf:'🇵🇱', af:'🇦🇱', date:'2026-06-14T19:00:00', venue:'Gillette Stadium, Boston',           hs:0,    as:2,    st:'completed' },
    { g:'E', md:2, home:'Francia',     away:'Polonia',      hf:'🇫🇷', af:'🇵🇱', date:'2026-06-20T22:00:00', venue:'MetLife Stadium, Nueva York',        hs:null, as:null, st:'upcoming' },
    { g:'E', md:2, home:'Albania',     away:'Bélgica',      hf:'🇦🇱', af:'🇧🇪', date:'2026-06-21T19:00:00', venue:'SoFi Stadium, Los Ángeles',          hs:null, as:null, st:'upcoming' },
    { g:'E', md:3, home:'Bélgica',     away:'Francia',      hf:'🇧🇪', af:'🇫🇷', date:'2026-06-24T19:00:00', venue:'AT&T Stadium, Dallas',               hs:null, as:null, st:'upcoming' },
    { g:'E', md:3, home:'Albania',     away:'Polonia',      hf:'🇦🇱', af:'🇵🇱', date:'2026-06-24T19:00:00', venue:'Hard Rock Stadium, Miami',           hs:null, as:null, st:'upcoming' },

    // ── GRUPO F: España, Portugal, Marruecos, Senegal ─────────────────────────
    { g:'F', md:1, home:'España',      away:'Portugal',     hf:'🇪🇸', af:'🇵🇹', date:'2026-06-14T22:00:00', venue:'NRG Stadium, Houston',               hs:3,    as:1,    st:'completed' },
    { g:'F', md:1, home:'Marruecos',   away:'Senegal',      hf:'🇲🇦', af:'🇸🇳', date:'2026-06-15T16:00:00', venue:'Arrowhead Stadium, Kansas City',     hs:2,    as:0,    st:'completed' },
    { g:'F', md:2, home:'España',      away:'Marruecos',    hf:'🇪🇸', af:'🇲🇦', date:'2026-06-21T22:00:00', venue:"Levi's Stadium, San Francisco",      hs:null, as:null, st:'upcoming' },
    { g:'F', md:2, home:'Portugal',    away:'Senegal',      hf:'🇵🇹', af:'🇸🇳', date:'2026-06-22T19:00:00', venue:'Gillette Stadium, Boston',           hs:null, as:null, st:'upcoming' },
    { g:'F', md:3, home:'Senegal',     away:'España',       hf:'🇸🇳', af:'🇪🇸', date:'2026-06-24T22:00:00', venue:'MetLife Stadium, Nueva York',        hs:null, as:null, st:'upcoming' },
    { g:'F', md:3, home:'Portugal',    away:'Marruecos',    hf:'🇵🇹', af:'🇲🇦', date:'2026-06-24T22:00:00', venue:'Lincoln Financial Field, Filadelfia',hs:null, as:null, st:'upcoming' },

    // ── GRUPO G: Alemania, Inglaterra, Japón, Australia ───────────────────────
    { g:'G', md:1, home:'Alemania',    away:'Inglaterra',   hf:'🇩🇪', af:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', date:'2026-06-15T19:00:00', venue:'SoFi Stadium, Los Ángeles',          hs:2,    as:1,    st:'completed' },
    { g:'G', md:1, home:'Japón',       away:'Australia',    hf:'🇯🇵', af:'🇦🇺', date:'2026-06-15T22:00:00', venue:"Levi's Stadium, San Francisco",      hs:0,    as:0,    st:'completed' },
    { g:'G', md:2, home:'Alemania',    away:'Japón',        hf:'🇩🇪', af:'🇯🇵', date:'2026-06-22T22:00:00', venue:'MetLife Stadium, Nueva York',        hs:null, as:null, st:'upcoming' },
    { g:'G', md:2, home:'Australia',   away:'Inglaterra',   hf:'🇦🇺', af:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', date:'2026-06-23T19:00:00', venue:'Hard Rock Stadium, Miami',           hs:null, as:null, st:'upcoming' },
    { g:'G', md:3, home:'Inglaterra',  away:'Alemania',     hf:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', af:'🇩🇪', date:'2026-06-26T19:00:00', venue:'AT&T Stadium, Dallas',               hs:null, as:null, st:'upcoming' },
    { g:'G', md:3, home:'Australia',   away:'Japón',        hf:'🇦🇺', af:'🇯🇵', date:'2026-06-26T19:00:00', venue:'NRG Stadium, Houston',               hs:null, as:null, st:'upcoming' },

    // ── GRUPO H: Países Bajos, Croacia, Corea del Sur, Irán ──────────────────
    { g:'H', md:1, home:'Países Bajos',away:'Croacia',      hf:'🇳🇱', af:'🇭🇷', date:'2026-06-16T16:00:00', venue:'Gillette Stadium, Boston',           hs:2,    as:0,    st:'completed' },
    { g:'H', md:1, home:'Corea del Sur',away:'Irán',        hf:'🇰🇷', af:'🇮🇷', date:'2026-06-16T19:00:00', venue:'Lincoln Financial Field, Filadelfia',hs:1,    as:1,    st:'completed' },
    { g:'H', md:2, home:'Países Bajos',away:'Corea del Sur',hf:'🇳🇱', af:'🇰🇷', date:'2026-06-23T22:00:00', venue:'AT&T Stadium, Dallas',               hs:null, as:null, st:'upcoming' },
    { g:'H', md:2, home:'Croacia',     away:'Irán',         hf:'🇭🇷', af:'🇮🇷', date:'2026-06-24T16:00:00', venue:'SoFi Stadium, Los Ángeles',          hs:null, as:null, st:'upcoming' },
    { g:'H', md:3, home:'Irán',        away:'Países Bajos', hf:'🇮🇷', af:'🇳🇱', date:'2026-06-27T19:00:00', venue:'MetLife Stadium, Nueva York',        hs:null, as:null, st:'upcoming' },
    { g:'H', md:3, home:'Croacia',     away:'Corea del Sur',hf:'🇭🇷', af:'🇰🇷', date:'2026-06-27T19:00:00', venue:'Arrowhead Stadium, Kansas City',     hs:null, as:null, st:'upcoming' },
  ];

  const insertGame = db.prepare(`
    INSERT INTO games (group_name, matchday, home_team, away_team, home_flag, away_flag, game_date, venue, home_score, away_score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((rows) => rows.forEach(r =>
    insertGame.run(r.g, r.md, r.home, r.away, r.hf, r.af, r.date, r.venue, r.hs, r.as, r.st)
  ));
  insertMany(GAMES);
  console.log(`✅ ${GAMES.length} partidos cargados`);
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No autorizado' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase().trim());
  if (exists) return res.status(409).json({ error: 'El usuario ya existe' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, name) VALUES (?, ?, ?)').run(
    username.toLowerCase().trim(), hash, name.trim()
  );
  const token = jwt.sign({ id: result.lastInsertRowid, username: username.toLowerCase().trim(), name: name.trim(), role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: result.lastInsertRowid, username: username.toLowerCase().trim(), name: name.trim(), role: 'user' } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

// ─── GAMES ROUTES ─────────────────────────────────────────────────────────────

app.get('/api/games', (req, res) => {
  const games = db.prepare('SELECT * FROM games ORDER BY game_date ASC').all();
  res.json(games);
});

app.put('/api/games/:id/score', authenticate, adminOnly, (req, res) => {
  const { home_score, away_score, status } = req.body;
  const gameId = parseInt(req.params.id);
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return res.status(404).json({ error: 'Partido no encontrado' });

  db.prepare('UPDATE games SET home_score = ?, away_score = ?, status = ? WHERE id = ?')
    .run(home_score, away_score, status || 'completed', gameId);

  // Recalculate points for all predictions of this game
  if (status === 'completed' || home_score !== null) {
    const predictions = db.prepare('SELECT * FROM predictions WHERE game_id = ?').all(gameId);
    const updatePts = db.prepare('UPDATE predictions SET points = ? WHERE id = ?');
    const recalc = db.transaction(() => {
      predictions.forEach(p => {
        let pts = 0;
        const predictedWinner = p.home_score > p.away_score ? 'H' : p.home_score < p.away_score ? 'A' : 'D';
        const actualWinner = home_score > away_score ? 'H' : home_score < away_score ? 'A' : 'D';
        if (p.home_score === home_score && p.away_score === away_score) {
          pts = 3;
        } else if (predictedWinner === actualWinner) {
          pts = 1;
        }
        updatePts.run(pts, p.id);
      });
    });
    recalc();
  }

  res.json({ success: true });
});

// ─── PREDICTIONS ROUTES ───────────────────────────────────────────────────────

app.get('/api/predictions', authenticate, (req, res) => {
  const predictions = db.prepare(`
    SELECT p.*, g.home_team, g.away_team, g.home_flag, g.away_flag,
           g.game_date, g.status as game_status, g.home_score as actual_home, g.away_score as actual_away
    FROM predictions p
    JOIN games g ON p.game_id = g.id
    WHERE p.user_id = ?
    ORDER BY g.game_date ASC
  `).all(req.user.id);
  res.json(predictions);
});

app.post('/api/predictions', authenticate, (req, res) => {
  const { game_id, home_score, away_score } = req.body;
  if (game_id === undefined || home_score === undefined || away_score === undefined)
    return res.status(400).json({ error: 'Datos incompletos' });
  if (home_score < 0 || away_score < 0) return res.status(400).json({ error: 'Puntaje inválido' });

  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(game_id);
  if (!game) return res.status(404).json({ error: 'Partido no encontrado' });

  // Lock check: reject if game has already started
  if (new Date() >= new Date(game.game_date))
    return res.status(403).json({ error: 'El partido ya comenzó, no se puede modificar el pronóstico' });

  db.prepare(`
    INSERT INTO predictions (user_id, game_id, home_score, away_score, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, game_id) DO UPDATE SET
      home_score = excluded.home_score,
      away_score = excluded.away_score,
      updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, game_id, home_score, away_score);

  res.json({ success: true });
});

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────

app.get('/api/leaderboard', (req, res) => {
  const leaderboard = db.prepare(`
    SELECT u.id, u.name, u.username,
           COALESCE(SUM(p.points), 0) as total_points,
           COUNT(p.id) as total_predictions,
           COUNT(CASE WHEN p.points = 3 THEN 1 END) as exact_scores,
           COUNT(CASE WHEN p.points = 1 THEN 1 END) as correct_results,
           COUNT(CASE WHEN p.points = 0 AND g.status = 'completed' THEN 1 END) as wrong_predictions
    FROM users u
    LEFT JOIN predictions p ON u.id = p.user_id
    LEFT JOIN games g ON p.game_id = g.id
    WHERE u.role = 'user'
    GROUP BY u.id
    ORDER BY total_points DESC, exact_scores DESC, total_predictions DESC
  `).all();
  res.json(leaderboard);
});

// ─── SPA FALLBACK ─────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏆 FIFA Quiniela 2026 corriendo en http://localhost:${PORT}`);
  console.log('   Admin: admin / Admin2026!\n');
});
