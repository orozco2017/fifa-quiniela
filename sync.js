// ═══════════════════════════════════════════════════════
//  Sincronización automática con API-Football
//  Actualiza resultados del Mundial 2026 en tiempo real
// ═══════════════════════════════════════════════════════

const API_URL = 'https://v3.football.api-sports.io';
const WC_LEAGUE_ID = 1;   // FIFA World Cup en API-Football
const WC_SEASON    = 2026;

// Mapeo de nombres en inglés (API) → español (nuestra BD)
const TEAM_MAP = {
  'Mexico':        'México',
  'Jamaica':       'Jamaica',
  'Venezuela':     'Venezuela',
  'El Salvador':   'El Salvador',
  'United States': 'USA',
  'USA':           'USA',
  'Panama':        'Panamá',
  'Honduras':      'Honduras',
  'Canada':        'Canadá',
  'Argentina':     'Argentina',
  'Chile':         'Chile',
  'Peru':          'Perú',
  'Paraguay':      'Paraguay',
  'Brazil':        'Brasil',
  'Uruguay':       'Uruguay',
  'Ecuador':       'Ecuador',
  'Bolivia':       'Bolivia',
  'France':        'Francia',
  'Belgium':       'Bélgica',
  'Poland':        'Polonia',
  'Albania':       'Albania',
  'Spain':         'España',
  'Portugal':      'Portugal',
  'Morocco':       'Marruecos',
  'Senegal':       'Senegal',
  'Germany':       'Alemania',
  'England':       'Inglaterra',
  'Japan':         'Japón',
  'Australia':     'Australia',
  'Netherlands':   'Países Bajos',
  'Croatia':       'Croacia',
  'South Korea':   'Corea del Sur',
  'Korea Republic':'Corea del Sur',
  'Iran':          'Irán',
};

const FINISHED = ['FT', 'AET', 'PEN']; // Statuses de partido terminado
const LIVE     = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'];

async function callAPI(path, apiKey) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  if (!res.ok) throw new Error(`API-Football error ${res.status}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0)
    throw new Error(Object.values(data.errors).join(', '));
  return data.response || [];
}

async function recalculateGamePoints(gameId, homeScore, awayScore, pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: preds } = await client.query(
      'SELECT * FROM predictions WHERE game_id = $1', [gameId]
    );
    for (const p of preds) {
      let pts = 0;
      const pw = p.home_score > p.away_score ? 'H' : p.home_score < p.away_score ? 'A' : 'D';
      const aw = homeScore > awayScore ? 'H' : homeScore < awayScore ? 'A' : 'D';
      if (p.home_score === homeScore && p.away_score === awayScore) pts = 3;
      else if (pw === aw) pts = 1;
      await client.query('UPDATE predictions SET points=$1 WHERE id=$2', [pts, p.id]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function syncResults(db, pool) {
  const API_KEY = process.env.FOOTBALL_API_KEY;
  if (!API_KEY) throw new Error('FOOTBALL_API_KEY no configurada');

  console.log('🔄 Sincronizando con API-Football...');

  const fixtures = await callAPI(
    `/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`, API_KEY
  );

  if (fixtures.length === 0) {
    console.log('⚠️  API-Football no devolvió partidos para WC 2026 aún.');
    return { updated: 0, live: 0, skipped: 0, total: 0, message: 'Sin datos de API aún — el torneo puede no haber iniciado.' };
  }

  let updated = 0, liveCount = 0, skipped = 0;

  for (const f of fixtures) {
    const { fixture, teams, goals } = f;
    const statusShort = fixture.status.short;

    const isFinished = FINISHED.includes(statusShort);
    const isLive     = LIVE.includes(statusShort);

    if (!isFinished && !isLive) { skipped++; continue; }

    const homeName = TEAM_MAP[teams.home.name] || teams.home.name;
    const awayName = TEAM_MAP[teams.away.name] || teams.away.name;

    const game = await db.one(
      'SELECT * FROM games WHERE home_team = $1 AND away_team = $2',
      [homeName, awayName]
    );

    if (!game) { skipped++; continue; }

    const newStatus  = isFinished ? 'completed' : 'live';
    const homeScore  = goals.home ?? 0;
    const awayScore  = goals.away ?? 0;

    await db.run(
      'UPDATE games SET home_score=$1, away_score=$2, status=$3 WHERE id=$4',
      [homeScore, awayScore, newStatus, game.id]
    );

    if (isFinished) {
      await recalculateGamePoints(game.id, homeScore, awayScore, pool);
      updated++;
    } else {
      liveCount++;
    }
  }

  const msg = `✅ Sync completo: ${updated} terminados, ${liveCount} en vivo, ${skipped} sin cambios`;
  console.log(msg);
  return { updated, live: liveCount, skipped, total: fixtures.length, message: msg };
}

// Auto-sync cada 30 minutos (solo si hay API key)
function startAutoSync(db, pool) {
  if (!process.env.FOOTBALL_API_KEY) return;
  // Primera sync al iniciar
  syncResults(db, pool).catch(e => console.error('Auto-sync error:', e.message));
  // Luego cada 30 minutos
  setInterval(() => {
    syncResults(db, pool).catch(e => console.error('Auto-sync error:', e.message));
  }, 30 * 60 * 1000);
}

module.exports = { syncResults, startAutoSync };
