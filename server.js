const express = require('express');
const path    = require('path');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');

const app        = express();
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fifa2026quiniela_dev_secret_change_in_prod';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── DATABASE ─────────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Helper para no repetir pool.query(...).rows
const db = {
  one:  async (text, p) => { const r = await pool.query(text, p); return r.rows[0] || null; },
  all:  async (text, p) => { const r = await pool.query(text, p); return r.rows; },
  run:  async (text, p) => pool.query(text, p),
};

// ─── MATCH DATA ───────────────────────────────────────────────────────────────

const GAMES = [
  // GRUPO A
  { g:'A', md:1, home:'México',      away:'Jamaica',      hf:'🇲🇽', af:'🇯🇲', date:'2026-06-11T19:00:00', venue:'SoFi Stadium, Los Ángeles',           hs:2,    as_:0,    st:'completed' },
  { g:'A', md:1, home:'Venezuela',   away:'El Salvador',  hf:'🇻🇪', af:'🇸🇻', date:'2026-06-11T22:00:00', venue:'Rose Bowl, Pasadena',                 hs:1,    as_:1,    st:'completed' },
  { g:'A', md:2, home:'México',      away:'Venezuela',    hf:'🇲🇽', af:'🇻🇪', date:'2026-06-16T22:00:00', venue:'SoFi Stadium, Los Ángeles',           hs:null, as_:null, st:'upcoming'  },
  { g:'A', md:2, home:'Jamaica',     away:'El Salvador',  hf:'🇯🇲', af:'🇸🇻', date:'2026-06-17T19:00:00', venue:'MetLife Stadium, Nueva York',         hs:null, as_:null, st:'upcoming'  },
  { g:'A', md:3, home:'El Salvador', away:'México',       hf:'🇸🇻', af:'🇲🇽', date:'2026-06-25T22:00:00', venue:'Estadio Azteca, Ciudad de México',    hs:null, as_:null, st:'upcoming'  },
  { g:'A', md:3, home:'Jamaica',     away:'Venezuela',    hf:'🇯🇲', af:'🇻🇪', date:'2026-06-25T22:00:00', venue:'AT&T Stadium, Dallas',                hs:null, as_:null, st:'upcoming'  },
  // GRUPO B
  { g:'B', md:1, home:'USA',         away:'Panamá',       hf:'🇺🇸', af:'🇵🇦', date:'2026-06-12T19:00:00', venue:'MetLife Stadium, Nueva York',         hs:2,    as_:1,    st:'completed' },
  { g:'B', md:1, home:'Honduras',    away:'Canadá',       hf:'🇭🇳', af:'🇨🇦', date:'2026-06-12T22:00:00', venue:'AT&T Stadium, Dallas',                hs:0,    as_:0,    st:'completed' },
  { g:'B', md:2, home:'USA',         away:'Honduras',     hf:'🇺🇸', af:'🇭🇳', date:'2026-06-17T22:00:00', venue:"Levi's Stadium, San Francisco",       hs:null, as_:null, st:'upcoming'  },
  { g:'B', md:2, home:'Canadá',      away:'Panamá',       hf:'🇨🇦', af:'🇵🇦', date:'2026-06-18T19:00:00', venue:'BMO Field, Toronto',                  hs:null, as_:null, st:'upcoming'  },
  { g:'B', md:3, home:'Panamá',      away:'USA',          hf:'🇵🇦', af:'🇺🇸', date:'2026-06-26T19:00:00', venue:'Hard Rock Stadium, Miami',            hs:null, as_:null, st:'upcoming'  },
  { g:'B', md:3, home:'Canadá',      away:'Honduras',     hf:'🇨🇦', af:'🇭🇳', date:'2026-06-26T19:00:00', venue:'BC Place, Vancouver',                 hs:null, as_:null, st:'upcoming'  },
  // GRUPO C
  { g:'C', md:1, home:'Argentina',   away:'Chile',        hf:'🇦🇷', af:'🇨🇱', date:'2026-06-12T22:00:00', venue:'Hard Rock Stadium, Miami',            hs:3,    as_:0,    st:'completed' },
  { g:'C', md:1, home:'Perú',        away:'Paraguay',     hf:'🇵🇪', af:'🇵🇾', date:'2026-06-13T19:00:00', venue:'NRG Stadium, Houston',                hs:2,    as_:1,    st:'completed' },
  { g:'C', md:2, home:'Argentina',   away:'Perú',         hf:'🇦🇷', af:'🇵🇪', date:'2026-06-18T22:00:00', venue:'MetLife Stadium, Nueva York',         hs:null, as_:null, st:'upcoming'  },
  { g:'C', md:2, home:'Paraguay',    away:'Chile',        hf:'🇵🇾', af:'🇨🇱', date:'2026-06-19T19:00:00', venue:'Arrowhead Stadium, Kansas City',      hs:null, as_:null, st:'upcoming'  },
  { g:'C', md:3, home:'Chile',       away:'Argentina',    hf:'🇨🇱', af:'🇦🇷', date:'2026-06-25T19:00:00', venue:'SoFi Stadium, Los Ángeles',           hs:null, as_:null, st:'upcoming'  },
  { g:'C', md:3, home:'Paraguay',    away:'Perú',         hf:'🇵🇾', af:'🇵🇪', date:'2026-06-25T19:00:00', venue:'Estadio Azteca, Ciudad de México',    hs:null, as_:null, st:'upcoming'  },
  // GRUPO D
  { g:'D', md:1, home:'Brasil',      away:'Uruguay',      hf:'🇧🇷', af:'🇺🇾', date:'2026-06-13T19:00:00', venue:"Levi's Stadium, San Francisco",       hs:2,    as_:0,    st:'completed' },
  { g:'D', md:1, home:'Ecuador',     away:'Bolivia',      hf:'🇪🇨', af:'🇧🇴', date:'2026-06-13T22:00:00', venue:'Arrowhead Stadium, Kansas City',      hs:1,    as_:0,    st:'completed' },
  { g:'D', md:2, home:'Brasil',      away:'Ecuador',      hf:'🇧🇷', af:'🇪🇨', date:'2026-06-19T22:00:00', venue:'AT&T Stadium, Dallas',                hs:null, as_:null, st:'upcoming'  },
  { g:'D', md:2, home:'Uruguay',     away:'Bolivia',      hf:'🇺🇾', af:'🇧🇴', date:'2026-06-20T19:00:00', venue:'NRG Stadium, Houston',                hs:null, as_:null, st:'upcoming'  },
  { g:'D', md:3, home:'Bolivia',     away:'Brasil',       hf:'🇧🇴', af:'🇧🇷', date:'2026-06-26T22:00:00', venue:'Hard Rock Stadium, Miami',            hs:null, as_:null, st:'upcoming'  },
  { g:'D', md:3, home:'Ecuador',     away:'Uruguay',      hf:'🇪🇨', af:'🇺🇾', date:'2026-06-26T22:00:00', venue:'MetLife Stadium, Nueva York',         hs:null, as_:null, st:'upcoming'  },
  // GRUPO E
  { g:'E', md:1, home:'Francia',     away:'Bélgica',      hf:'🇫🇷', af:'🇧🇪', date:'2026-06-14T16:00:00', venue:'Lincoln Financial Field, Filadelfia', hs:1,    as_:0,    st:'completed' },
  { g:'E', md:1, home:'Polonia',     away:'Albania',      hf:'🇵🇱', af:'🇦🇱', date:'2026-06-14T19:00:00', venue:'Gillette Stadium, Boston',            hs:0,    as_:2,    st:'completed' },
  { g:'E', md:2, home:'Francia',     away:'Polonia',      hf:'🇫🇷', af:'🇵🇱', date:'2026-06-20T22:00:00', venue:'MetLife Stadium, Nueva York',         hs:null, as_:null, st:'upcoming'  },
  { g:'E', md:2, home:'Albania',     away:'Bélgica',      hf:'🇦🇱', af:'🇧🇪', date:'2026-06-21T19:00:00', venue:'SoFi Stadium, Los Ángeles',           hs:null, as_:null, st:'upcoming'  },
  { g:'E', md:3, home:'Bélgica',     away:'Francia',      hf:'🇧🇪', af:'🇫🇷', date:'2026-06-24T19:00:00', venue:'AT&T Stadium, Dallas',                hs:null, as_:null, st:'upcoming'  },
  { g:'E', md:3, home:'Albania',     away:'Polonia',      hf:'🇦🇱', af:'🇵🇱', date:'2026-06-24T19:00:00', venue:'Hard Rock Stadium, Miami',            hs:null, as_:null, st:'upcoming'  },
  // GRUPO F
  { g:'F', md:1, home:'España',      away:'Portugal',     hf:'🇪🇸', af:'🇵🇹', date:'2026-06-14T22:00:00', venue:'NRG Stadium, Houston',                hs:3,    as_:1,    st:'completed' },
  { g:'F', md:1, home:'Marruecos',   away:'Senegal',      hf:'🇲🇦', af:'🇸🇳', date:'2026-06-15T16:00:00', venue:'Arrowhead Stadium, Kansas City',      hs:2,    as_:0,    st:'completed' },
  { g:'F', md:2, home:'España',      away:'Marruecos',    hf:'🇪🇸', af:'🇲🇦', date:'2026-06-21T22:00:00', venue:"Levi's Stadium, San Francisco",       hs:null, as_:null, st:'upcoming'  },
  { g:'F', md:2, home:'Portugal',    away:'Senegal',      hf:'🇵🇹', af:'🇸🇳', date:'2026-06-22T19:00:00', venue:'Gillette Stadium, Boston',            hs:null, as_:null, st:'upcoming'  },
  { g:'F', md:3, home:'Senegal',     away:'España',       hf:'🇸🇳', af:'🇪🇸', date:'2026-06-24T22:00:00', venue:'MetLife Stadium, Nueva York',         hs:null, as_:null, st:'upcoming'  },
  { g:'F', md:3, home:'Portugal',    away:'Marruecos',    hf:'🇵🇹', af:'🇲🇦', date:'2026-06-24T22:00:00', venue:'Lincoln Financial Field, Filadelfia', hs:null, as_:null, st:'upcoming'  },
  // GRUPO G
  { g:'G', md:1, home:'Alemania',    away:'Inglaterra',   hf:'🇩🇪', af:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', date:'2026-06-15T19:00:00', venue:'SoFi Stadium, Los Ángeles',           hs:2,    as_:1,    st:'completed' },
  { g:'G', md:1, home:'Japón',       away:'Australia',    hf:'🇯🇵', af:'🇦🇺', date:'2026-06-15T22:00:00', venue:"Levi's Stadium, San Francisco",       hs:0,    as_:0,    st:'completed' },
  { g:'G', md:2, home:'Alemania',    away:'Japón',        hf:'🇩🇪', af:'🇯🇵', date:'2026-06-22T22:00:00', venue:'MetLife Stadium, Nueva York',         hs:null, as_:null, st:'upcoming'  },
  { g:'G', md:2, home:'Australia',   away:'Inglaterra',   hf:'🇦🇺', af:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', date:'2026-06-23T19:00:00', venue:'Hard Rock Stadium, Miami',            hs:null, as_:null, st:'upcoming'  },
  { g:'G', md:3, home:'Inglaterra',  away:'Alemania',     hf:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', af:'🇩🇪', date:'2026-06-26T19:00:00', venue:'AT&T Stadium, Dallas',                hs:null, as_:null, st:'upcoming'  },
  { g:'G', md:3, home:'Australia',   away:'Japón',        hf:'🇦🇺', af:'🇯🇵', date:'2026-06-26T19:00:00', venue:'NRG Stadium, Houston',                hs:null, as_:null, st:'upcoming'  },
  // GRUPO H
  { g:'H', md:1, home:'Países Bajos',away:'Croacia',       hf:'🇳🇱', af:'🇭🇷', date:'2026-06-16T16:00:00', venue:'Gillette Stadium, Boston',            hs:2,    as_:0,    st:'completed' },
  { g:'H', md:1, home:'Corea del Sur',away:'Irán',         hf:'🇰🇷', af:'🇮🇷', date:'2026-06-16T19:00:00', venue:'Lincoln Financial Field, Filadelfia', hs:1,    as_:1,    st:'completed' },
  { g:'H', md:2, home:'Países Bajos',away:'Corea del Sur', hf:'🇳🇱', af:'🇰🇷', date:'2026-06-23T22:00:00', venue:'AT&T Stadium, Dallas',                hs:null, as_:null, st:'upcoming'  },
  { g:'H', md:2, home:'Croacia',     away:'Irán',          hf:'🇭🇷', af:'🇮🇷', date:'2026-06-24T16:00:00', venue:'SoFi Stadium, Los Ángeles',           hs:null, as_:null, st:'upcoming'  },
  { g:'H', md:3, home:'Irán',        away:'Países Bajos',  hf:'🇮🇷', af:'🇳🇱', date:'2026-06-27T19:00:00', venue:'MetLife Stadium, Nueva York',         hs:null, as_:null, st:'upcoming'  },
  { g:'H', md:3, home:'Croacia',     away:'Corea del Sur', hf:'🇭🇷', af:'🇰🇷', date:'2026-06-27T19:00:00', venue:'Arrowhead Stadium, Kansas City',      hs:null, as_:null, st:'upcoming'  },
];

// ─── DB INIT ──────────────────────────────────────────────────────────────────

async function initDB() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id       SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name     TEXT NOT NULL,
      role     TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id         SERIAL PRIMARY KEY,
      group_name TEXT NOT NULL,
      matchday   INTEGER NOT NULL,
      home_team  TEXT NOT NULL,
      away_team  TEXT NOT NULL,
      home_flag  TEXT DEFAULT '',
      away_flag  TEXT DEFAULT '',
      game_date  TEXT NOT NULL,
      venue      TEXT DEFAULT '',
      home_score INTEGER,
      away_score INTEGER,
      status     TEXT DEFAULT 'upcoming'
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      game_id    INTEGER NOT NULL REFERENCES games(id),
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      points     INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, game_id)
    )
  `);

  // Seed admin
  const admin = await db.one('SELECT id FROM users WHERE username = $1', ['admin']);
  if (!admin) {
    const hash = bcrypt.hashSync('Admin2026!', 10);
    await db.run('INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)', ['admin', hash, 'Administrador', 'admin']);
    console.log('✅ Admin creado: admin / Admin2026!');
  }

  // Seed games
  const { rows } = await pool.query('SELECT COUNT(*) as c FROM games');
  if (parseInt(rows[0].c) === 0) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const g of GAMES) {
        await client.query(
          `INSERT INTO games (group_name,matchday,home_team,away_team,home_flag,away_flag,game_date,venue,home_score,away_score,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [g.g, g.md, g.home, g.away, g.hf, g.af, g.date, g.venue, g.hs, g.as_, g.st]
        );
      }
      await client.query('COMMIT');
      console.log(`✅ ${GAMES.length} partidos cargados`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
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

app.post('/api/auth/register', async (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const exists = await db.one('SELECT id FROM users WHERE username = $1', [username.toLowerCase().trim()]);
  if (exists) return res.status(409).json({ error: 'El usuario ya existe' });

  const hash = bcrypt.hashSync(password, 10);
  const row  = await db.one(
    'INSERT INTO users (username, password, name) VALUES ($1, $2, $3) RETURNING id, username, name, role',
    [username.toLowerCase().trim(), hash, name.trim()]
  );
  const token = jwt.sign({ id: row.id, username: row.username, name: row.name, role: row.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: row });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  const user = await db.one('SELECT * FROM users WHERE username = $1', [username.toLowerCase().trim()]);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

app.put('/api/auth/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const user = await db.one('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!user || !bcrypt.compareSync(currentPassword, user.password))
    return res.status(401).json({ error: 'La contraseña actual es incorrecta' });

  const hash = bcrypt.hashSync(newPassword, 10);
  await db.run('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);
  res.json({ success: true });
});

// ─── GAMES ROUTES ─────────────────────────────────────────────────────────────

app.get('/api/games', async (req, res) => {
  const games = await db.all('SELECT * FROM games ORDER BY game_date ASC');
  res.json(games);
});

app.put('/api/games/:id/score', authenticate, adminOnly, async (req, res) => {
  const { home_score, away_score, status } = req.body;
  const gameId = parseInt(req.params.id);

  const game = await db.one('SELECT * FROM games WHERE id = $1', [gameId]);
  if (!game) return res.status(404).json({ error: 'Partido no encontrado' });

  await db.run('UPDATE games SET home_score=$1, away_score=$2, status=$3 WHERE id=$4',
    [home_score, away_score, status || 'completed', gameId]);

  // Recalculate points for all predictions of this game
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: preds } = await client.query('SELECT * FROM predictions WHERE game_id = $1', [gameId]);
    for (const p of preds) {
      let pts = 0;
      const pw = p.home_score > p.away_score ? 'H' : p.home_score < p.away_score ? 'A' : 'D';
      const aw = home_score  > away_score    ? 'H' : home_score  < away_score    ? 'A' : 'D';
      if (p.home_score === home_score && p.away_score === away_score) pts = 3;
      else if (pw === aw) pts = 1;
      await client.query('UPDATE predictions SET points=$1 WHERE id=$2', [pts, p.id]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Error al recalcular puntos' });
  } finally {
    client.release();
  }
  res.json({ success: true });
});

// ─── PREDICTIONS ──────────────────────────────────────────────────────────────

app.get('/api/predictions', authenticate, async (req, res) => {
  const preds = await db.all(`
    SELECT p.*, g.home_team, g.away_team, g.home_flag, g.away_flag,
           g.game_date, g.status as game_status, g.home_score as actual_home, g.away_score as actual_away
    FROM predictions p
    JOIN games g ON p.game_id = g.id
    WHERE p.user_id = $1
    ORDER BY g.game_date ASC
  `, [req.user.id]);
  res.json(preds);
});

app.post('/api/predictions', authenticate, async (req, res) => {
  const { game_id, home_score, away_score } = req.body;
  if (game_id === undefined || home_score === undefined || away_score === undefined)
    return res.status(400).json({ error: 'Datos incompletos' });
  if (home_score < 0 || away_score < 0)
    return res.status(400).json({ error: 'Puntaje inválido' });

  const game = await db.one('SELECT * FROM games WHERE id = $1', [game_id]);
  if (!game) return res.status(404).json({ error: 'Partido no encontrado' });
  if (new Date() >= new Date(game.game_date))
    return res.status(403).json({ error: 'El partido ya comenzó, no se puede modificar el pronóstico' });

  await db.run(`
    INSERT INTO predictions (user_id, game_id, home_score, away_score, updated_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, game_id) DO UPDATE SET
      home_score = EXCLUDED.home_score,
      away_score = EXCLUDED.away_score,
      updated_at = CURRENT_TIMESTAMP
  `, [req.user.id, game_id, home_score, away_score]);

  res.json({ success: true });
});

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────

app.get('/api/leaderboard', async (req, res) => {
  const rows = await db.all(`
    SELECT u.id, u.name, u.username,
           COALESCE(SUM(p.points), 0) AS total_points,
           COUNT(p.id) AS total_predictions,
           COUNT(CASE WHEN p.points = 3 THEN 1 END) AS exact_scores,
           COUNT(CASE WHEN p.points = 1 THEN 1 END) AS correct_results,
           COUNT(CASE WHEN p.points = 0 AND g.status = 'completed' THEN 1 END) AS wrong_predictions
    FROM users u
    LEFT JOIN predictions p ON u.id = p.user_id
    LEFT JOIN games g ON p.game_id = g.id
    WHERE u.role = 'user'
    GROUP BY u.id
    ORDER BY total_points DESC, exact_scores DESC, total_predictions DESC
  `);
  res.json(rows);
});

// ─── SPA FALLBACK ─────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ────────────────────────────────────────────────────────────────────

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🏆 FIFA Quiniela 2026 en http://localhost:${PORT}\n`);
    });
  })
  .catch(err => {
    console.error('Error inicializando DB:', err);
    process.exit(1);
  });
