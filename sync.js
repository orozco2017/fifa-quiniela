// ═══════════════════════════════════════════════════════
//  Sincronización con football-data.org (gratis, WC 2026)
// ═══════════════════════════════════════════════════════

const API_URL  = 'https://api.football-data.org/v4';
const WC_CODE  = 'WC'; // Código del Mundial en football-data.org

// Mapeo nombres inglés → español (todas las variaciones conocidas de football-data.org)
const TEAM_MAP = {
  // CONCACAF
  'Mexico':              'México',
  'México':              'México',
  'Jamaica':             'Jamaica',
  'Venezuela':           'Venezuela',
  'El Salvador':         'El Salvador',
  'United States':       'USA',
  'USA':                 'USA',
  'US':                  'USA',
  'Panama':              'Panamá',
  'Panamá':              'Panamá',
  'Honduras':            'Honduras',
  'Canada':              'Canadá',
  'Canadá':              'Canadá',
  // CONMEBOL
  'Argentina':           'Argentina',
  'Chile':               'Chile',
  'Peru':                'Perú',
  'Perú':                'Perú',
  'Paraguay':            'Paraguay',
  'Brazil':              'Brasil',
  'Brasil':              'Brasil',
  'Uruguay':             'Uruguay',
  'Ecuador':             'Ecuador',
  'Bolivia':             'Bolivia',
  // UEFA
  'France':              'Francia',
  'Belgium':             'Bélgica',
  'Poland':              'Polonia',
  'Albania':             'Albania',
  'Spain':               'España',
  'Portugal':            'Portugal',
  'Germany':             'Alemania',
  'England':             'Inglaterra',
  'Netherlands':         'Países Bajos',
  'Croatia':             'Croacia',
  // CAF
  'Morocco':             'Marruecos',
  'Senegal':             'Senegal',
  // AFC
  'Japan':               'Japón',
  'Australia':           'Australia',
  'South Korea':         'Corea del Sur',
  'Korea Republic':      'Corea del Sur',
  'Korea DPR':           'Corea del Sur',
  'Iran':                'Irán',
  'IR Iran':             'Irán',
  'Islamic Republic of Iran': 'Irán',
};

// Normaliza texto: minúsculas, sin acentos, sin caracteres especiales
function normalize(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim();
}

// Mapa normalizado para búsqueda flexible
const TEAM_MAP_NORMALIZED = {};
Object.entries(TEAM_MAP).forEach(([k, v]) => {
  TEAM_MAP_NORMALIZED[normalize(k)] = v;
});

function mapTeam(name) {
  if (!name) return null;
  // 1. Coincidencia exacta
  if (TEAM_MAP[name]) return TEAM_MAP[name];
  // 2. Coincidencia normalizada
  const norm = normalize(name);
  if (TEAM_MAP_NORMALIZED[norm]) return TEAM_MAP_NORMALIZED[norm];
  // 3. Devolver el nombre original (para log)
  return name;
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
  const unmatched = [];

  for (const match of matches) {
    const { homeTeam, awayTeam, score, status, utcDate } = match;

    const isFinished  = status === 'FINISHED';
    const isLive      = status === 'IN_PLAY' || status === 'PAUSED' || status === 'HALFTIME';
    const isScheduled = status === 'SCHEDULED' || status === 'TIMED';

    const homeName = mapTeam(homeTeam.name || homeTeam.shortName || '');
    const awayName = mapTeam(awayTeam.name || awayTeam.shortName || '');

    const game = await db.one(
      'SELECT * FROM games WHERE home_team = $1 AND away_team = $2',
      [homeName, awayName]
    );

    if (!game) {
      unmatched.push(`${homeName} vs ${awayName}`);
      skipped++; continue;
    }

    if (isScheduled) {
      // Limpiar datos de demo: poner upcoming con fecha real y sin marcador
      await db.run(
        'UPDATE games SET home_score=NULL, away_score=NULL, status=$1, game_date=$2 WHERE id=$3',
        ['upcoming', utcDate, game.id]
      );
      skipped++;
    } else if (isFinished) {
      const homeScore = score.fullTime.home ?? 0;
      const awayScore = score.fullTime.away ?? 0;
      await db.run(
        'UPDATE games SET home_score=$1, away_score=$2, status=$3, game_date=$4 WHERE id=$5',
        [homeScore, awayScore, 'completed', utcDate, game.id]
      );
      await recalculateGamePoints(game.id, homeScore, awayScore, pool);
      updated++;
    } else if (isLive) {
      const homeScore = score.fullTime.home ?? score.halfTime.home ?? 0;
      const awayScore = score.fullTime.away ?? score.halfTime.away ?? 0;
      await db.run(
        'UPDATE games SET home_score=$1, away_score=$2, status=$3 WHERE id=$4',
        [homeScore, awayScore, 'live', game.id]
      );
      liveCount++;
    }
  }

  if (unmatched.length > 0) console.log('⚠️ Sin coincidencia:', unmatched.slice(0, 10).join(' | '));
  const msg = `✅ Sync completo: ${updated} terminados, ${liveCount} en vivo, ${skipped} sin cambios de ${matches.length} partidos`;
  console.log(msg);
  return { updated, live: liveCount, skipped, total: matches.length, message: msg, unmatched: unmatched.slice(0, 10) };
}

function startAutoSync(db, pool) {
  if (!process.env.FOOTBALL_API_KEY) return;
  syncResults(db, pool).catch(e => console.error('Auto-sync error:', e.message));
  setInterval(() => {
    syncResults(db, pool).catch(e => console.error('Auto-sync error:', e.message));
  }, 30 * 60 * 1000);
}

module.exports = { syncResults, startAutoSync };
