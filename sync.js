// ═══════════════════════════════════════════════════════
//  Sincronización con football-data.org — WC 2026
// ═══════════════════════════════════════════════════════

const API_URL = 'https://api.football-data.org/v4';
const WC_CODE = 'WC';

// Nombres en español
const TEAM_TO_ES = {
  'Mexico':               'México',
  'South Africa':         'Sudáfrica',
  'South Korea':          'Corea del Sur',
  'Korea Republic':       'Corea del Sur',
  'Czechia':              'República Checa',
  'Czech Republic':       'República Checa',
  'Canada':               'Canadá',
  'Bosnia-Herzegovina':   'Bosnia-Herzegovina',
  'Bosnia and Herzegovina':'Bosnia-Herzegovina',
  'United States':        'USA',
  'USA':                  'USA',
  'Paraguay':             'Paraguay',
  'Qatar':                'Qatar',
  'Switzerland':          'Suiza',
  'Brazil':               'Brasil',
  'Morocco':              'Marruecos',
  'Haiti':                'Haití',
  'Scotland':             'Escocia',
  'Australia':            'Australia',
  'Turkey':               'Turquía',
  'Türkiye':              'Turquía',
  'Germany':              'Alemania',
  'Curaçao':              'Curaçao',
  'Curacao':              'Curaçao',
  'Netherlands':          'Países Bajos',
  'Japan':                'Japón',
  'Ivory Coast':          'Costa de Marfil',
  "Côte d'Ivoire":        'Costa de Marfil',
  'Ecuador':              'Ecuador',
  'Sweden':               'Suecia',
  'Tunisia':              'Túnez',
  'Spain':                'España',
  'Cape Verde Islands':   'Cabo Verde',
  'Cape Verde':           'Cabo Verde',
  'Belgium':              'Bélgica',
  'Egypt':                'Egipto',
  'Saudi Arabia':         'Arabia Saudita',
  'Uruguay':              'Uruguay',
  'Iran':                 'Irán',
  'IR Iran':              'Irán',
  'New Zealand':          'Nueva Zelanda',
  'France':               'Francia',
  'Senegal':              'Senegal',
  'Iraq':                 'Irak',
  'Norway':               'Noruega',
  'Argentina':            'Argentina',
  'Algeria':              'Argelia',
  'Austria':              'Austria',
  'Jordan':               'Jordania',
  'Portugal':             'Portugal',
  'England':              'Inglaterra',
  'Colombia':             'Colombia',
  'Nigeria':              'Nigeria',
  'Indonesia':            'Indonesia',
  'Venezuela':            'Venezuela',
  'Chile':                'Chile',
  'Peru':                 'Perú',
  'Poland':               'Polonia',
  'Croatia':              'Croacia',
  'Serbia':               'Serbia',
  'Ukraine':              'Ucrania',
  'Hungary':              'Hungría',
  'Romania':              'Rumanía',
  'Cameroon':             'Camerún',
  'Ghana':                'Ghana',
  'Mali':                 'Malí',
  'Kenya':                'Kenia',
  'Tanzania':             'Tanzania',
  'Bahrain':              'Bahréin',
  'Oman':                 'Omán',
  'Honduras':             'Honduras',
  'Panama':               'Panamá',
  'Jamaica':              'Jamaica',
  'El Salvador':          'El Salvador',
  'Costa Rica':           'Costa Rica',
  'Bolivia':              'Bolivia',
  'Albania':              'Albania',
};

// Banderas
const FLAG_MAP = {
  'Mexico':               '🇲🇽',
  'South Africa':         '🇿🇦',
  'South Korea':          '🇰🇷',
  'Korea Republic':       '🇰🇷',
  'Czechia':              '🇨🇿',
  'Czech Republic':       '🇨🇿',
  'Canada':               '🇨🇦',
  'Bosnia-Herzegovina':   '🇧🇦',
  'Bosnia and Herzegovina':'🇧🇦',
  'United States':        '🇺🇸',
  'USA':                  '🇺🇸',
  'Paraguay':             '🇵🇾',
  'Qatar':                '🇶🇦',
  'Switzerland':          '🇨🇭',
  'Brazil':               '🇧🇷',
  'Morocco':              '🇲🇦',
  'Haiti':                '🇭🇹',
  'Scotland':             '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Australia':            '🇦🇺',
  'Turkey':               '🇹🇷',
  'Türkiye':              '🇹🇷',
  'Germany':              '🇩🇪',
  'Curaçao':              '🇨🇼',
  'Curacao':              '🇨🇼',
  'Netherlands':          '🇳🇱',
  'Japan':                '🇯🇵',
  'Ivory Coast':          '🇨🇮',
  "Côte d'Ivoire":        '🇨🇮',
  'Ecuador':              '🇪🇨',
  'Sweden':               '🇸🇪',
  'Tunisia':              '🇹🇳',
  'Spain':                '🇪🇸',
  'Cape Verde Islands':   '🇨🇻',
  'Cape Verde':           '🇨🇻',
  'Belgium':              '🇧🇪',
  'Egypt':                '🇪🇬',
  'Saudi Arabia':         '🇸🇦',
  'Uruguay':              '🇺🇾',
  'Iran':                 '🇮🇷',
  'IR Iran':              '🇮🇷',
  'New Zealand':          '🇳🇿',
  'France':               '🇫🇷',
  'Senegal':              '🇸🇳',
  'Iraq':                 '🇮🇶',
  'Norway':               '🇳🇴',
  'Argentina':            '🇦🇷',
  'Algeria':              '🇩🇿',
  'Austria':              '🇦🇹',
  'Jordan':               '🇯🇴',
  'Portugal':             '🇵🇹',
  'England':              '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Colombia':             '🇨🇴',
  'Nigeria':              '🇳🇬',
  'Indonesia':            '🇮🇩',
  'Venezuela':            '🇻🇪',
  'Chile':                '🇨🇱',
  'Peru':                 '🇵🇪',
  'Poland':               '🇵🇱',
  'Croatia':              '🇭🇷',
  'Serbia':               '🇷🇸',
  'Ukraine':              '🇺🇦',
  'Honduras':             '🇭🇳',
  'Panama':               '🇵🇦',
  'Jamaica':              '🇯🇲',
  'El Salvador':          '🇸🇻',
  'Costa Rica':           '🇨🇷',
  'Bolivia':              '🇧🇴',
  'Cameroon':             '🇨🇲',
  'Ghana':                '🇬🇭',
  'Albania':              '🇦🇱',
};

async function callAPI(path, apiKey) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'X-Auth-Token': apiKey },
  });
  if (res.status === 403) throw new Error('API Key inválida o sin acceso');
  if (res.status === 429) throw new Error('Límite de llamadas alcanzado, intenta en 1 minuto');
  if (!res.ok) throw new Error(`Error API: ${res.status}`);
  return res.json();
}

// ─── IMPORTAR CALENDARIO REAL ─────────────────────────────────────────────────

async function importSchedule(db, pool) {
  const API_KEY = process.env.FOOTBALL_API_KEY;
  if (!API_KEY) throw new Error('FOOTBALL_API_KEY no configurada');

  console.log('📥 Importando calendario real del Mundial 2026...');
  const data = await callAPI(`/competitions/${WC_CODE}/matches`, API_KEY);
  const matches = data.matches || [];
  if (matches.length === 0) throw new Error('No se obtuvieron partidos de la API');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM predictions');
    await client.query('DELETE FROM games');

    let inserted = 0;
    for (const match of matches) {
      const { homeTeam, awayTeam, utcDate, matchday, group, stage } = match;

      // Solo fase de grupos por ahora
      if (stage !== 'GROUP_STAGE') continue;

      const groupLetter = group ? group.replace('GROUP_', '') : '?';
      const homeName    = TEAM_TO_ES[homeTeam.name] || homeTeam.name;
      const awayName    = TEAM_TO_ES[awayTeam.name] || awayTeam.name;
      const homeFlag    = FLAG_MAP[homeTeam.name] || '🏳️';
      const awayFlag    = FLAG_MAP[awayTeam.name] || '🏳️';

      await client.query(
        `INSERT INTO games (group_name, matchday, home_team, away_team, home_flag, away_flag, game_date, venue, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [groupLetter, matchday || 1, homeName, awayName, homeFlag, awayFlag, utcDate, '', 'upcoming']
      );
      inserted++;
    }

    await client.query('COMMIT');
    console.log(`✅ ${inserted} partidos importados`);
    return { inserted, total: matches.length };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ─── SINCRONIZAR RESULTADOS ───────────────────────────────────────────────────

async function recalculateGamePoints(gameId, homeScore, awayScore, pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: preds } = await client.query('SELECT * FROM predictions WHERE game_id = $1', [gameId]);
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

  console.log('🔄 Sincronizando resultados...');
  const data    = await callAPI(`/competitions/${WC_CODE}/matches`, API_KEY);
  const matches = data.matches || [];

  if (matches.length === 0)
    return { updated: 0, live: 0, skipped: 0, total: 0,
      message: '⚠️ Sin datos de la API aún.' };

  let updated = 0, liveCount = 0, skipped = 0;

  for (const match of matches) {
    const { homeTeam, awayTeam, score, status, utcDate } = match;
    const isFinished  = status === 'FINISHED';
    const isLive      = ['IN_PLAY','PAUSED','HALFTIME'].includes(status);
    if (!isFinished && !isLive) { skipped++; continue; }

    const homeName = TEAM_TO_ES[homeTeam.name] || homeTeam.name;
    const awayName = TEAM_TO_ES[awayTeam.name] || awayTeam.name;
    const game     = await db.one('SELECT * FROM games WHERE home_team=$1 AND away_team=$2', [homeName, awayName]);
    if (!game) { skipped++; continue; }

    const hs = score.fullTime.home ?? 0;
    const as_ = score.fullTime.away ?? 0;
    await db.run('UPDATE games SET home_score=$1, away_score=$2, status=$3 WHERE id=$4',
      [hs, as_, isFinished ? 'completed' : 'live', game.id]);
    if (isFinished) { await recalculateGamePoints(game.id, hs, as_, pool); updated++; }
    else liveCount++;
  }

  const msg = `✅ Sync: ${updated} terminados, ${liveCount} en vivo, ${skipped} sin cambios`;
  console.log(msg);
  return { updated, live: liveCount, skipped, total: matches.length, message: msg };
}

function startAutoSync(db, pool) {
  if (!process.env.FOOTBALL_API_KEY) return;
  syncResults(db, pool).catch(e => console.error('Auto-sync:', e.message));
  setInterval(() => syncResults(db, pool).catch(e => console.error('Auto-sync:', e.message)), 30 * 60 * 1000);
}

module.exports = { syncResults, startAutoSync, importSchedule };
