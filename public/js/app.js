/* ═══════════════════════════════════════════════════════
   FIFA QUINIELA 2026 — Frontend Application
   ═══════════════════════════════════════════════════════ */

let state = {
  token: null,
  user: null,
  games: [],
  predictions: [],
  leaderboard: [],
  currentTab: 'stats',
  adminGameId: null,
};

// ─── API HELPERS ──────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

const apiGet  = (path) => api('GET', path);
const apiPost = (path, body) => api('POST', path, body);
const apiPut  = (path, body) => api('PUT', path, body);

// ─── AUTH ─────────────────────────────────────────────────────────────────────

async function doLogin() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const errEl = document.getElementById('auth-error');

  if (!username || !password) return showAuthError('Ingresa usuario y contraseña', errEl);

  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Verificando...';

  try {
    const data = await apiPost('/api/auth/login', { username, password });
    setAuth(data.token, data.user);
    showApp();
  } catch (e) {
    showAuthError(e.message, errEl);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar al Sistema';
  }
}

async function doRegister() {
  const name     = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-user').value.trim();
  const password = document.getElementById('reg-pass').value;
  const errEl    = document.getElementById('reg-error');

  if (!name || !username || !password) return showAuthError('Todos los campos son requeridos', errEl);

  const btn = document.getElementById('btn-register');
  btn.disabled = true;
  btn.textContent = 'Creando cuenta...';

  try {
    const data = await apiPost('/api/auth/register', { name, username, password });
    setAuth(data.token, data.user);
    showApp();
  } catch (e) {
    showAuthError(e.message, errEl);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear Cuenta';
  }
}

function doLogout() {
  state.token = null;
  state.user  = null;
  localStorage.removeItem('quiniela_token');
  localStorage.removeItem('quiniela_user');
  document.getElementById('page-app').classList.add('hidden');
  document.getElementById('page-landing').classList.remove('hidden');
}

function setAuth(token, user) {
  state.token = token;
  state.user  = user;
  localStorage.setItem('quiniela_token', token);
  localStorage.setItem('quiniela_user', JSON.stringify(user));
}

function showAuthError(msg, el) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showLogin() {
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('register-view').classList.add('hidden');
  document.getElementById('auth-error').classList.add('hidden');
}

function showRegister() {
  document.getElementById('register-view').classList.remove('hidden');
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('reg-error').classList.add('hidden');
}

// ─── PAGE MANAGEMENT ──────────────────────────────────────────────────────────

function showApp() {
  document.getElementById('page-landing').classList.add('hidden');
  document.getElementById('page-app').classList.remove('hidden');
  document.getElementById('nav-username').textContent = `👤 ${state.user.name}`;
  loadAll();
}

async function loadAll() {
  try {
    const [games, predictions, leaderboard] = await Promise.all([
      apiGet('/api/games'),
      apiGet('/api/predictions'),
      apiGet('/api/leaderboard'),
    ]);
    state.games       = games;
    state.predictions = predictions;
    state.leaderboard = leaderboard;
    renderCurrentTab();
  } catch (e) {
    console.error('Error cargando datos:', e);
  }
}

function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  renderCurrentTab();
}

function renderCurrentTab() {
  if (state.currentTab === 'stats')    renderStats();
  if (state.currentTab === 'ranking')  renderRanking();
  if (state.currentTab === 'quiniela') renderMyQuiniela();
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

function isLocked(gameDate) {
  return new Date() >= new Date(gameDate);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr) {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

function getResult(homeScore, awayScore) {
  if (homeScore > awayScore) return 'H';
  if (homeScore < awayScore) return 'A';
  return 'D';
}

function getPredictionPoints(pred, game) {
  if (game.status !== 'completed' || game.home_score === null) return null;
  if (pred.home_score === game.home_score && pred.away_score === game.away_score) return 3;
  if (getResult(pred.home_score, pred.away_score) === getResult(game.home_score, game.away_score)) return 1;
  return 0;
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2800);
}

// ─── RENDER: STATS TAB ────────────────────────────────────────────────────────

function renderStats() {
  const completed = state.games.filter(g => g.status === 'completed').sort((a, b) => new Date(b.game_date) - new Date(a.game_date));
  const upcoming  = state.games.filter(g => g.status !== 'completed').sort((a, b) => new Date(a.game_date) - new Date(b.game_date));

  // Recent results
  const recentEl = document.getElementById('recent-results');
  if (completed.length === 0) {
    recentEl.innerHTML = '<p class="empty-state">Aún no hay resultados registrados.</p>';
  } else {
    recentEl.innerHTML = completed.slice(0, 12).map(g => renderResultCard(g)).join('');
  }

  // Upcoming
  const upcomingEl = document.getElementById('upcoming-games');
  if (upcoming.length === 0) {
    upcomingEl.innerHTML = '<p class="empty-state">No hay partidos próximos.</p>';
  } else {
    upcomingEl.innerHTML = upcoming.slice(0, 12).map(g => renderUpcomingCard(g)).join('');
  }

  // Group standings
  renderGroupStandings();
}

function renderResultCard(g) {
  const adminBtn = state.user?.role === 'admin'
    ? `<button class="btn-admin-score" onclick="openScoreModal(${g.id})">✏️ Editar</button>`
    : '';
  return `
    <div class="result-card">
      <span class="result-group">G${g.group_name}</span>
      <div class="result-teams">
        <div class="team-name team-home">${g.home_flag} ${g.home_team}</div>
        <div class="score-box final">${g.home_score} – ${g.away_score}</div>
        <div class="team-name team-away">${g.away_team} ${g.away_flag}</div>
      </div>
      <div class="result-meta">
        ${formatDate(g.game_date)}<br/>
        <small>${g.venue}</small>
        ${adminBtn}
      </div>
    </div>`;
}

function renderUpcomingCard(g) {
  const locked = isLocked(g.game_date);
  const adminBtn = state.user?.role === 'admin'
    ? `<button class="btn-admin-score" onclick="openScoreModal(${g.id})">⚽ Registrar</button>`
    : '';
  return `
    <div class="result-card">
      <span class="result-group">G${g.group_name}</span>
      <div class="result-teams">
        <div class="team-name team-home">${g.home_flag} ${g.home_team}</div>
        <div class="score-box upcoming">${locked ? '🔴 LIVE' : formatTime(g.game_date)}</div>
        <div class="team-name team-away">${g.away_team} ${g.away_flag}</div>
      </div>
      <div class="result-meta">
        ${formatDate(g.game_date)}<br/>
        <small>${g.venue}</small>
        ${adminBtn}
      </div>
    </div>`;
}

function renderGroupStandings() {
  const groups = {};
  state.games.forEach(g => {
    if (!groups[g.group_name]) groups[g.group_name] = {};
    [g.home_team, g.away_team].forEach(team => {
      if (!groups[g.group_name][team])
        groups[g.group_name][team] = { name: team, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, flag: '' };
    });
    if (g.group_name) {
      groups[g.group_name][g.home_team].flag = g.home_flag;
      groups[g.group_name][g.away_team].flag = g.away_flag;
    }
    if (g.status === 'completed' && g.home_score !== null) {
      const ht = groups[g.group_name][g.home_team];
      const at = groups[g.group_name][g.away_team];
      ht.pj++; at.pj++;
      ht.gf += g.home_score; ht.gc += g.away_score;
      at.gf += g.away_score; at.gc += g.home_score;
      if (g.home_score > g.away_score)       { ht.pg++; ht.pts += 3; at.pp++; }
      else if (g.home_score < g.away_score)  { at.pg++; at.pts += 3; ht.pp++; }
      else                                   { ht.pe++; ht.pts++; at.pe++; at.pts++; }
    }
  });

  const el = document.getElementById('group-standings');
  el.innerHTML = Object.keys(groups).sort().map(gName => {
    const teams = Object.values(groups[gName]).sort((a, b) =>
      b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf
    );
    return `
      <div class="group-block">
        <span class="group-label">GRUPO ${gName}</span>
        <table class="standings-table">
          <thead>
            <tr><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GD</th><th>Pts</th></tr>
          </thead>
          <tbody>
            ${teams.map((t, i) => `
              <tr>
                <td><div class="standing-team">
                  <span class="standing-pos ${i < 2 ? 'qualified' : ''}">${i + 1}</span>
                  ${t.flag} ${t.name}
                </div></td>
                <td>${t.pj}</td><td>${t.pg}</td><td>${t.pe}</td><td>${t.pp}</td>
                <td>${t.gf - t.gc >= 0 ? '+' : ''}${t.gf - t.gc}</td>
                <td class="pts-cell">${t.pts}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }).join('');
}

// ─── RENDER: RANKING TAB ──────────────────────────────────────────────────────

function renderRanking() {
  const lb = state.leaderboard;

  // Podium
  const podiumEl = document.getElementById('podium');
  const medals   = ['🥇', '🥈', '🥉'];
  const posClass = ['pos-1', 'pos-2', 'pos-3'];
  const display  = lb.slice(0, 3);

  // Reorder: 2nd, 1st, 3rd for visual podium effect
  const podiumOrder = display.length >= 2 ? [display[1], display[0], display[2]].filter(Boolean) : display;

  podiumEl.innerHTML = podiumOrder.map((p, idx) => {
    const actualPos = lb.indexOf(p);
    const pc = posClass[actualPos] || '';
    const pct = p.total_predictions > 0
      ? Math.round(((p.exact_scores + p.correct_results) / p.total_predictions) * 100)
      : 0;
    return `
      <div class="podium-card ${pc}">
        <div class="podium-pos-badge">${actualPos + 1}</div>
        <div class="podium-medal">${medals[actualPos] || ''}</div>
        <div class="podium-name">${p.name}</div>
        <div class="podium-pts">${p.total_points}</div>
        <div class="podium-pts-label">puntos</div>
        <div class="podium-exact">⭐ ${p.exact_scores} exactos</div>
      </div>`;
  }).join('');

  // Full table
  const tbody = document.getElementById('ranking-tbody');
  if (lb.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Aún no hay participantes con pronósticos.</td></tr>';
    return;
  }

  tbody.innerHTML = lb.map((p, i) => {
    const pct = p.total_predictions > 0
      ? Math.round(((p.exact_scores + p.correct_results) / p.total_predictions) * 100)
      : 0;
    const medal = i < 3 ? medals[i] : '';
    return `
      <tr>
        <td class="rank-pos">${medal || (i + 1)}</td>
        <td>
          <div class="rank-name">${p.name}</div>
          <div class="rank-user">@${p.username}</div>
        </td>
        <td class="num rank-pts">${p.total_points}</td>
        <td class="num">⭐ ${p.exact_scores}</td>
        <td class="num">✅ ${p.correct_results}</td>
        <td class="num">${p.total_predictions}</td>
        <td class="num bar-cell">
          <div class="eff-bar"><div class="eff-fill" style="width:${pct}%"></div></div>
          <div class="eff-pct">${pct}%</div>
        </td>
      </tr>`;
  }).join('');
}

// ─── RENDER: MY QUINIELA ──────────────────────────────────────────────────────

function renderMyQuiniela() {
  const container = document.getElementById('quiniela-container');
  const predMap   = {};
  state.predictions.forEach(p => { predMap[p.game_id] = p; });

  // Group games by group_name then matchday
  const byGroup = {};
  state.games.forEach(g => {
    const key = g.group_name;
    if (!byGroup[key]) byGroup[key] = {};
    if (!byGroup[key][g.matchday]) byGroup[key][g.matchday] = [];
    byGroup[key][g.matchday].push(g);
  });

  container.innerHTML = Object.keys(byGroup).sort().map(gName => {
    const matchdays = byGroup[gName];
    return `
      <div class="card">
        <div class="quiniela-group-header">
          <span class="quiniela-group-badge">GRUPO ${gName}</span>
        </div>
        ${Object.keys(matchdays).sort((a, b) => a - b).map(md => `
          <div style="margin-bottom:16px;">
            <div style="font-size:.75rem;color:var(--text-dim);font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em;">
              Jornada ${md}
            </div>
            <div class="prediction-cards">
              ${matchdays[md].map(g => renderPredCard(g, predMap[g.id])).join('')}
            </div>
          </div>`).join('')}
      </div>`;
  }).join('');
}

function renderPredCard(game, pred) {
  const locked    = isLocked(game.game_date);
  const completed = game.status === 'completed' && game.home_score !== null;
  const predHome  = pred ? pred.home_score : '';
  const predAway  = pred ? pred.away_score : '';

  let actionsHtml = '';

  if (completed && pred) {
    const pts = getPredictionPoints(pred, game);
    const cls = pts === 3 ? 'exact' : pts === 1 ? 'result' : 'wrong';
    const lbl = pts === 3 ? '⭐ +3 pts' : pts === 1 ? '✅ +1 pt' : '❌ 0 pts';
    actionsHtml = `
      <div class="pred-result-display">${game.home_score} – ${game.away_score}</div>
      <div class="points-badge ${cls}">${lbl}</div>`;
  } else if (completed && !pred) {
    actionsHtml = `
      <div class="pred-result-display">${game.home_score} – ${game.away_score}</div>
      <div class="points-badge wrong">Sin pronóstico</div>`;
  } else if (locked) {
    actionsHtml = `<div class="lock-badge">🔒 Bloqueado</div>`;
  } else {
    actionsHtml = `
      <button class="btn-save-pred" id="save-btn-${game.id}"
        onclick="savePrediction(${game.id})">
        ${pred ? '💾 Actualizar' : '💾 Guardar'}
      </button>`;
  }

  return `
    <div class="pred-card ${locked ? 'locked' : ''}">
      <div class="pred-meta">
        <div class="pred-date">${formatDate(game.game_date)}</div>
        <div>${formatTime(game.game_date)}</div>
        <div class="pred-venue">${game.venue.split(',')[0]}</div>
      </div>

      <div class="pred-match">
        <div class="pred-team home">
          <span>${game.home_team}</span>
          <span class="pred-flag">${game.home_flag}</span>
        </div>
        <div class="pred-inputs">
          <input type="number" id="pred-h-${game.id}" min="0" max="20"
            value="${predHome}" placeholder="0"
            ${locked || completed ? 'disabled' : ''}/>
          <span class="pred-dash">–</span>
          <input type="number" id="pred-a-${game.id}" min="0" max="20"
            value="${predAway}" placeholder="0"
            ${locked || completed ? 'disabled' : ''}/>
        </div>
        <div class="pred-team">
          <span class="pred-flag">${game.away_flag}</span>
          <span>${game.away_team}</span>
        </div>
      </div>

      <div class="pred-actions">${actionsHtml}</div>
    </div>`;
}

async function savePrediction(gameId) {
  const homeInput = document.getElementById(`pred-h-${gameId}`);
  const awayInput = document.getElementById(`pred-a-${gameId}`);
  const btn       = document.getElementById(`save-btn-${gameId}`);

  const homeScore = parseInt(homeInput.value);
  const awayScore = parseInt(awayInput.value);

  if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
    showToast('Ingresa un marcador válido', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    await apiPost('/api/predictions', { game_id: gameId, home_score: homeScore, away_score: awayScore });

    // Update local state
    const existing = state.predictions.findIndex(p => p.game_id === gameId);
    const entry = { game_id: gameId, home_score: homeScore, away_score: awayScore, points: 0 };
    if (existing >= 0) state.predictions[existing] = { ...state.predictions[existing], ...entry };
    else state.predictions.push(entry);

    btn.textContent = '✅ Guardado';
    btn.classList.add('saved');
    showToast(`Pronóstico guardado: ${homeScore} – ${awayScore}`);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = '💾 Guardar';
    showToast(e.message, 'error');
  }
}

// ─── ADMIN: SCORE MODAL ───────────────────────────────────────────────────────

function openScoreModal(gameId) {
  const game = state.games.find(g => g.id === gameId);
  if (!game) return;
  state.adminGameId = gameId;

  document.getElementById('modal-game-name').textContent = `${game.home_flag} ${game.home_team}  vs  ${game.away_team} ${game.away_flag}`;
  document.getElementById('modal-home-label').textContent = game.home_team;
  document.getElementById('modal-away-label').textContent = game.away_team;
  document.getElementById('modal-home-score').value = game.home_score ?? 0;
  document.getElementById('modal-away-score').value = game.away_score ?? 0;

  document.getElementById('modal-score').classList.remove('hidden');
  document.getElementById('modal-backdrop').classList.remove('hidden');
}

function closeScoreModal() {
  document.getElementById('modal-score').classList.add('hidden');
  document.getElementById('modal-backdrop').classList.add('hidden');
  state.adminGameId = null;
}

async function saveScore() {
  const gameId    = state.adminGameId;
  const homeScore = parseInt(document.getElementById('modal-home-score').value);
  const awayScore = parseInt(document.getElementById('modal-away-score').value);

  if (isNaN(homeScore) || isNaN(awayScore)) {
    showToast('Ingresa un marcador válido', 'error');
    return;
  }

  try {
    await apiPut(`/api/games/${gameId}/score`, { home_score: homeScore, away_score: awayScore, status: 'completed' });
    closeScoreModal();
    showToast('Resultado registrado correctamente');
    await loadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (!document.getElementById('page-landing').classList.contains('hidden')) {
      const loginView = document.getElementById('login-view');
      if (!loginView.classList.contains('hidden')) doLogin();
      else doRegister();
    }
    if (!document.getElementById('modal-score').classList.contains('hidden')) {
      saveScore();
    }
  }
  if (e.key === 'Escape') {
    closeScoreModal();
  }
});

// ─── INIT ─────────────────────────────────────────────────────────────────────

(function init() {
  const savedToken = localStorage.getItem('quiniela_token');
  const savedUser  = localStorage.getItem('quiniela_user');

  if (savedToken && savedUser) {
    try {
      // Quick expiry check (JWT payload is base64 in 2nd segment)
      const payload = JSON.parse(atob(savedToken.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error('expired');
      state.token = savedToken;
      state.user  = JSON.parse(savedUser);
      showApp();
      return;
    } catch {
      localStorage.removeItem('quiniela_token');
      localStorage.removeItem('quiniela_user');
    }
  }

  // Show landing
  document.getElementById('page-landing').classList.remove('hidden');
})();
