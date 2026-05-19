// ═══════════════════════════════════════════════════════
//  Sincronización con football-data.org (gratis, WC 2026)
// ═══════════════════════════════════════════════════════

const API_URL  = 'https://api.football-data.org/v4';
const WC_CODE  = 'WC'; // Código del Mundial en football-data.org

// Mapeo nombres inglés → español
const TEAM_MAP = {
  'Mexico':          'México',
  'Jamaica':         'Jamaica',
  'Venezuela':       'Venezuela',
  'El Salvador':     'El Salvador',
  'United States':   'USA',
  'USA':             'USA',
  'Panama':          'Panamá',
  'Honduras':        'Honduras',
  'Canada':          'Canadá',
  'Argentina':       'Argentina',
  'Chile':           'Chile',
  'Peru':            'Perú',
  'Paraguay':        'Paraguay',
  'Brazil':          'Brasil',
  'Uruguay':         'Uruguay',
  'Ecuador':         'Ecuador',
  'Bolivia':         'Bolivia',
  'France':          'Francia',
  'Belgium':         'Bélgica',
  'Poland':          'Polonia',
  'Albania':         'Albania',
  'Spain':           'España',
  'Portugal':        'Portugal',
  'Morocco':         'Marruecos',
  'Senegal':         'Senegal',
  'Germany':         'Alemania',
  'England':         'Inglaterra',
  'Japan':           'Japón',
  'Australia':       'Australia',
  'Netherlands':     'Países Bajos',
  'Croatia':         'Croacia',
  'South Korea':     'Corea del Sur',
  'Korea Republic':  'Corea del Sur',
  'Iran':            'Irán',
};

function mapTeam(name) {
  return TEAM_MAP[name] || name;
}

async function callAPI(path, apiKey) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'X-Auth-Token': apiKey },
  });
  if (res.status === 403) throw new Error('API Key inválida o sin acceso');
  if (res.status === 429) throw new Error('Límite de llamadas alcanzado, intenta en 1 minuto');
  if (!res.ok) throw new Error(`Error API: ${res.status}`);
  return res.json();
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
  if (!API_KEY) throw new Error('FOOTBALL_API_KEY no configurada en las variables de entorno');

  console.log('🔄 Sincronizando con football-data.org...');

  // Traer todos los partidos del Mundial 2026
  const data = await callAPI(`/competitions/${WC_CODE}/matches`, API_KEY);
  const matches = data.matches || [];

  if (matches.length === 0) {
    return {
      updated: 0, live: 0, skipped: 0, total: 0,
      message: '⚠️ Sin partidos disponibles aún — el torneo iniciará el 11 de junio de 2026.'
    };
  }

  let updated = 0, liveCount = 0, skipped = 0;

  for (const match of matches) {
    const { homeTeam, awayTeam, score, status } = match;

    const isFinished = status === 'FINISHED';
    const isLive     = status === 'IN_PLAY' || status === 'PAUSED' || status === 'HALFTIME';

    if (!isFinished && !isLive) { skipped++; continue; }

    const homeName = mapTeam(homeTeam.name);
    const awayName = mapTeam(awayTeam.name);

    const game = await db.one(
      'SELECT * FROM games WHERE home_team = $1 AND away_team = $2',
      [homeName, awayName]
    );

    if (!game) { skipped++; continue; }

    const homeScore = score.fullTime.home ?? score.halfTime.home ?? 0;
    const awayScore = score.fullTime.away ?? score.halfTime.away ?? 0;
    const newStatus = isFinished ? 'completed' : 'live';

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

  const msg = `✅ Sync completo: ${updated} terminados, ${liveCount} en vivo, ${skipped} sin cambios de ${matches.length} partidos`;
  console.log(msg);
  return { updated, live: liveCount, skipped, total: matches.length, message: msg };
}

function startAutoSync(db, pool) {
  if (!process.env.FOOTBALL_API_KEY) return;
  syncResults(db, pool).catch(e => console.error('Auto-sync error:', e.message));
  setInterval(() => {
    syncResults(db, pool).catch(e => console.error('Auto-sync error:', e.message));
  }, 30 * 60 * 1000);
}

module.exports = { syncResults, startAutoSync };
