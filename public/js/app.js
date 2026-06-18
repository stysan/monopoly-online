// ─── Constants ────────────────────────────────────────────────────
const AVATARS = {
  'top-hat': '🎩', 'car': '🚗', 'iron': '👝', 'ship': '🚢',
  'dog': '🐶', 'wheelbarrow': '🛒', 'thimble': '🧵', 'boot': '👢'
};

const COLORS = {
  brown: '#8B4513', lightblue: '#87CEEB', pink: '#FF69B4', orange: '#FF8C00',
  red: '#DC143C', yellow: '#FFD700', green: '#228B22', darkblue: '#00008B'
};

const BOARD = [
  { id: 0, name: 'GO', type: 'go' },
  { id: 1, name: 'Mediterranean', type: 'property', color: 'brown', price: 60 },
  { id: 2, name: 'Community Chest', type: 'community_chest' },
  { id: 3, name: 'Baltic Ave', type: 'property', color: 'brown', price: 60 },
  { id: 4, name: 'Income Tax', type: 'tax', amount: 200 },
  { id: 5, name: 'Reading RR', type: 'railroad', price: 200 },
  { id: 6, name: 'Oriental Ave', type: 'property', color: 'lightblue', price: 100 },
  { id: 7, name: 'Chance', type: 'chance' },
  { id: 8, name: 'Vermont Ave', type: 'property', color: 'lightblue', price: 100 },
  { id: 9, name: 'Connecticut', type: 'property', color: 'lightblue', price: 120 },
  { id: 10, name: 'Jail', type: 'jail' },
  { id: 11, name: 'St. Charles', type: 'property', color: 'pink', price: 140 },
  { id: 12, name: 'Electric Co.', type: 'utility', price: 150 },
  { id: 13, name: 'States Ave', type: 'property', color: 'pink', price: 140 },
  { id: 14, name: 'Virginia Ave', type: 'property', color: 'pink', price: 160 },
  { id: 15, name: 'Penn. RR', type: 'railroad', price: 200 },
  { id: 16, name: 'St. James', type: 'property', color: 'orange', price: 180 },
  { id: 17, name: 'Community Chest', type: 'community_chest' },
  { id: 18, name: 'Tennessee Ave', type: 'property', color: 'orange', price: 180 },
  { id: 19, name: 'New York Ave', type: 'property', color: 'orange', price: 200 },
  { id: 20, name: 'Free Parking', type: 'free_parking' },
  { id: 21, name: 'Kentucky Ave', type: 'property', color: 'red', price: 220 },
  { id: 22, name: 'Chance', type: 'chance' },
  { id: 23, name: 'Indiana Ave', type: 'property', color: 'red', price: 220 },
  { id: 24, name: 'Illinois Ave', type: 'property', color: 'red', price: 240 },
  { id: 25, name: 'B&O RR', type: 'railroad', price: 200 },
  { id: 26, name: 'Atlantic Ave', type: 'property', color: 'yellow', price: 260 },
  { id: 27, name: 'Ventnor Ave', type: 'property', color: 'yellow', price: 260 },
  { id: 28, name: 'Water Works', type: 'utility', price: 150 },
  { id: 29, name: 'Marvin Gardens', type: 'property', color: 'yellow', price: 280 },
  { id: 30, name: 'Go To Jail', type: 'go_to_jail' },
  { id: 31, name: 'Pacific Ave', type: 'property', color: 'green', price: 300 },
  { id: 32, name: 'N. Carolina', type: 'property', color: 'green', price: 300 },
  { id: 33, name: 'Community Chest', type: 'community_chest' },
  { id: 34, name: 'Penn. Ave', type: 'property', color: 'green', price: 320 },
  { id: 35, name: 'Short Line RR', type: 'railroad', price: 200 },
  { id: 36, name: 'Chance', type: 'chance' },
  { id: 37, name: 'Park Place', type: 'property', color: 'darkblue', price: 350 },
  { id: 38, name: 'Luxury Tax', type: 'tax', amount: 100 },
  { id: 39, name: 'Boardwalk', type: 'property', color: 'darkblue', price: 400 }
];

// Board layout: bottom row (0-10 left to right), left col (11-19 bottom to top),
// top row (20-30 right to left), right col (31-39 top to bottom)
// Grid positions for each square
function getSquareGridPos(id) {
  if (id === 0)  return { col: 11, row: 11, cls: 'square-corner' };
  if (id <= 9)   return { col: 11 - id, row: 11, cls: 'square bottom' };
  if (id === 10) return { col: 1, row: 11, cls: 'square-corner' };
  if (id <= 19)  return { col: 1, row: 11 - (id - 10), cls: 'square left' };
  if (id === 20) return { col: 1, row: 1, cls: 'square-corner' };
  if (id <= 29)  return { col: 1 + (id - 20), row: 1, cls: 'square top' };
  if (id === 30) return { col: 11, row: 1, cls: 'square-corner' };
  if (id <= 39)  return { col: 11, row: 1 + (id - 30), cls: 'square right' };
}

// ─── State ────────────────────────────────────────────────────────
let socket = null;
let token = localStorage.getItem('mono_token');
let currentUser = null;
let gameState = null;
let gameId = null;
let selectedAvatar = 'top-hat';
let chatMessages = [];

// ─── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildAvatarGrid();
  setupAuthUI();
  if (token) tryAutoLogin();
});

async function tryAutoLogin() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.user) {
      currentUser = data.user;
      onLoggedIn();
    } else {
      token = null;
      localStorage.removeItem('mono_token');
    }
  } catch (e) {
    token = null;
  }
}

// ─── Auth UI ──────────────────────────────────────────────────────
function buildAvatarGrid() {
  const grid = document.getElementById('avatar-grid');
  for (const [key, emoji] of Object.entries(AVATARS)) {
    const div = document.createElement('div');
    div.className = 'avatar-option' + (key === 'top-hat' ? ' selected' : '');
    div.textContent = emoji;
    div.title = key;
    div.onclick = () => {
      document.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('selected'));
      div.classList.add('selected');
      selectedAvatar = key;
    };
    grid.appendChild(div);
  }
}

function setupAuthUI() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const t = tab.dataset.tab;
      document.getElementById('login-form').classList.toggle('hidden', t !== 'login');
      document.getElementById('register-form').classList.toggle('hidden', t !== 'register');
    };
  });

  document.getElementById('login-btn').onclick = async () => {
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    if (!u || !p) return showAuthError('Fill in all fields');
    const res = await postJSON('/api/auth/login', { username: u, password: p });
    if (res.error) return showAuthError(res.error);
    token = res.token;
    localStorage.setItem('mono_token', token);
    currentUser = res.user;
    onLoggedIn();
  };

  document.getElementById('register-btn').onclick = async () => {
    const u = document.getElementById('reg-username').value.trim();
    const p = document.getElementById('reg-password').value;
    if (!u || !p) return showAuthError('Fill in all fields');
    const res = await postJSON('/api/auth/register', { username: u, password: p, avatar: selectedAvatar });
    if (res.error) return showAuthError(res.error);
    token = res.token;
    localStorage.setItem('mono_token', token);
    currentUser = res.user;
    onLoggedIn();
  };

  // Enter key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (!document.getElementById('auth-screen').classList.contains('active')) return;
      const loginActive = !document.getElementById('login-form').classList.contains('hidden');
      if (loginActive) document.getElementById('login-btn').click();
      else document.getElementById('register-btn').click();
    }
  });
}

function showAuthError(msg) {
  document.getElementById('auth-error').textContent = msg;
  setTimeout(() => document.getElementById('auth-error').textContent = '', 4000);
}

// ─── After Login ──────────────────────────────────────────────────
function onLoggedIn() {
  document.getElementById('header-avatar').textContent = AVATARS[currentUser.avatar] || '🎩';
  document.getElementById('header-username').textContent = currentUser.username;

  showScreen('lobby');
  initSocket();
  setupLobbyUI();
  loadLeaderboard('wins');
}

function setupLobbyUI() {
  document.getElementById('logout-btn').onclick = async () => {
    await postJSON('/api/auth/logout', {});
    socket?.disconnect();
    token = null;
    localStorage.removeItem('mono_token');
    currentUser = null;
    showScreen('auth');
  };

  document.getElementById('profile-btn').onclick = () => showProfile();
  document.getElementById('close-profile').onclick = () => document.getElementById('profile-modal').classList.add('hidden');

  document.getElementById('create-room-btn').onclick = () => {
    document.getElementById('create-options').classList.toggle('hidden');
  };

  document.getElementById('confirm-create-btn').onclick = () => {
    socket.emit('create_room', {
      name: document.getElementById('room-name').value || undefined,
      isPublic: !document.getElementById('opt-private').checked,
      settings: {
        auctionEnabled: document.getElementById('opt-auction').checked,
        freeParkingJackpot: document.getElementById('opt-freeparking').checked,
        maxPlayers: parseInt(document.getElementById('opt-maxplayers').value)
      }
    });
  };

  document.getElementById('join-code-btn').onclick = () => {
    const code = document.getElementById('room-code').value.trim().toUpperCase();
    if (!code) return;
    socket.emit('join_room', { gameId: code });
  };

  document.getElementById('refresh-rooms-btn').onclick = () => socket?.emit('get_rooms');

  // Leaderboard tabs
  document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadLeaderboard(tab.dataset.type);
    };
  });
}

// ─── Socket ───────────────────────────────────────────────────────
function initSocket() {
  socket = io({ auth: { token } });

  socket.on('connect', () => {
    console.log('Connected:', socket.id);
    socket.emit('get_rooms');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err.message);
  });

  socket.on('online_count', (count) => {
    document.getElementById('online-count').textContent = `${count} online`;
  });

  socket.on('rooms_list', (rooms) => renderRooms(rooms));

  socket.on('room_created', ({ gameId: id }) => {
    gameId = id;
    document.getElementById('game-room-id').textContent = id;
    // Go to game screen right away so Start Game button is visible
    showScreen('game');
    buildBoard();
  });

  socket.on('player_joined', ({ username }) => showGameNotif(`${username} joined!`));
  socket.on('player_left', ({ username }) => showGameNotif(`${username} left.`));

  socket.on('game_started', () => {
    if (!document.getElementById('game-screen').classList.contains('active')) {
      showScreen('game');
      buildBoard();
    }
  });

  socket.on('game_state', (state) => {
    gameState = state;
    gameId = state.id;
    document.getElementById('game-room-id').textContent = state.id;

    // Switch to game screen whenever we have a game state
    if (!document.getElementById('game-screen').classList.contains('active')) {
      showScreen('game');
      buildBoard();
    }

    renderGameState(state);
  });

  socket.on('dice_rolled', ({ username, roll, event }) => {
    showDice(roll, username, event);
  });

  socket.on('chat_message', ({ username, text, ts }) => {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="chat-author">${escHtml(username)}:</span> ${escHtml(text)}`;
    const msgs = document.getElementById('chat-messages');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  });

  socket.on('game_ended', ({ winner, finalState }) => {
    gameState = finalState;
    renderGameState(finalState);
    showWinnerModal(winner, finalState);
  });

  socket.on('error', (msg) => {
    showNotif(msg, 'error');
  });
}

// ─── Screens ──────────────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`${name}-screen`).classList.add('active');
}

// ─── Rooms ────────────────────────────────────────────────────────
function renderRooms(rooms) {
  const el = document.getElementById('rooms-list');
  if (!rooms.length) {
    el.innerHTML = '<div class="empty-state">No open rooms. Create one!</div>';
    return;
  }
  el.innerHTML = '';
  for (const r of rooms) {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.innerHTML = `
      <div class="room-info">
        <div class="room-name">${escHtml(r.name)}</div>
        <div class="room-meta">Host: ${escHtml(r.host)} · ${r.players}/${r.maxPlayers} players
          ${r.settings.auctionEnabled ? ' · Auction' : ''}
          ${r.settings.freeParkingJackpot ? ' · FP Jackpot' : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:11px;color:var(--text2)">${r.id}</span>
        <button class="btn-sm">Join</button>
      </div>
    `;
    card.querySelector('button').onclick = () => socket.emit('join_room', { gameId: r.id });
    el.appendChild(card);
  }
}

// ─── Leaderboard ─────────────────────────────────────────────────
async function loadLeaderboard(type) {
  const res = await fetch(`/api/leaderboard?type=${type}`);
  const data = await res.json();
  const el = document.getElementById('leaderboard-list');
  if (!data.data?.length) {
    el.innerHTML = '<div class="empty-state">No data yet</div>';
    return;
  }
  el.innerHTML = '';

  const labels = { wins: 'wins', winrate: '%', richest: '$', landlord: ' props', rentking: '$' };
  const label = labels[type] || '';

  data.data.forEach((entry, i) => {
    const div = document.createElement('div');
    div.className = 'lb-entry';
    const rankCls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const score = type === 'richest' || type === 'rentking'
      ? '$' + formatMoney(entry.score) : entry.score + label;
    div.innerHTML = `
      <span class="lb-rank ${rankCls}">${i + 1}</span>
      <span>${AVATARS[entry.avatar] || '🎩'}</span>
      <span class="lb-name">${escHtml(entry.username)}</span>
      <span class="lb-score">${score}</span>
    `;
    el.appendChild(div);
  });
}

// ─── Board Rendering ──────────────────────────────────────────────
function buildBoard() {
  const board = document.getElementById('monopoly-board');
  board.innerHTML = '';

  for (const sq of BOARD) {
    const pos = getSquareGridPos(sq.id);
    const el = document.createElement('div');
    el.id = `sq-${sq.id}`;
    el.className = pos.cls;
    el.style.gridColumn = pos.col;
    el.style.gridRow = pos.row;

    if (pos.cls === 'square-corner') {
      el.innerHTML = getCornerHTML(sq);
    } else {
      el.innerHTML = getSquareHTML(sq, pos.cls);
    }

    el.onclick = () => onSquareClick(sq.id);
    board.appendChild(el);
  }

  // Center
  const center = document.createElement('div');
  center.className = 'board-center';
  center.style.gridColumn = '2 / 11';
  center.style.gridRow = '2 / 11';
  center.innerHTML = `
    <div class="center-logo">MONOPOLY<span>ONLINE</span></div>
    <div class="center-net-worths" id="center-nw"></div>
  `;
  board.appendChild(center);
}

function getCornerHTML(sq) {
  const icons = { go: '▶ GO', jail: '🔒 JAIL', free_parking: '🅿️ FREE', go_to_jail: '👮 GO TO JAIL' };
  return `<div style="font-size:8px;font-weight:900;text-align:center;color:#111;padding:4px">${icons[sq.type] || sq.name}</div>`;
}

function getSquareHTML(sq, cls) {
  let colorBar = '';
  if (sq.color) {
    colorBar = `<div class="color-bar" style="--sq-color:${COLORS[sq.color] || '#888'}"></div>`;
  }

  let icon = '';
  if (sq.type === 'railroad') icon = '🚂 ';
  if (sq.type === 'utility') icon = sq.id === 12 ? '⚡ ' : '💧 ';
  if (sq.type === 'tax') icon = '💸 ';
  if (sq.type === 'chance') icon = '❓ ';
  if (sq.type === 'community_chest') icon = '📦 ';

  const priceStr = sq.price ? `<div class="square-price">$${sq.price}</div>` : '';

  return `
    ${colorBar}
    <div class="square-name">${icon}${sq.name}</div>
    ${priceStr}
    <div class="square-buildings" id="bld-${sq.id}"></div>
    <div class="tokens-container" id="tokens-${sq.id}"></div>
  `;
}

// ─── Game State Rendering ─────────────────────────────────────────
function renderGameState(state) {
  if (!state) return;
  renderPlayers(state);
  renderTokensOnBoard(state);
  renderBuildingsOnBoard(state);
  renderTurnPanel(state);
  renderMyProperties(state);
  renderAuction(state);
  renderTrade(state);
  renderLog(state);
  renderCenterNetWorths(state);
}

function renderPlayers(state) {
  const el = document.getElementById('players-list');
  el.innerHTML = '';
  for (const p of state.players) {
    const isMe = p.userId === currentUser.id;
    const isCurrent = p.userId === state.currentPlayerId;
    const div = document.createElement('div');
    div.className = `player-card ${isCurrent ? 'current-turn' : ''} ${p.isBankrupt ? 'bankrupt' : ''} ${!p.isConnected ? 'disconnected' : ''}`;
    div.innerHTML = `
      <span class="player-token">${AVATARS[p.avatar] || '🎩'}</span>
      <div class="player-info">
        <div class="player-name">${escHtml(p.username)}${isMe ? ' (you)' : ''}${isCurrent ? ' 🎲' : ''}</div>
        <div class="player-money">$${formatMoney(p.money)}</div>
        <div class="player-status">Net worth: $${formatMoney(p.netWorth)}</div>
        ${p.inJail ? `<div class="player-jail">🔒 In Jail (${p.jailTurns}/${3})</div>` : ''}
        ${p.isBankrupt ? '<div class="player-jail">BANKRUPT</div>' : ''}
        ${!p.isConnected ? '<div class="player-jail">Disconnected</div>' : ''}
        ${p.getOutOfJailCards > 0 ? `<div style="font-size:10px;color:var(--success)">🃏 ${p.getOutOfJailCards} jail card</div>` : ''}
      </div>
    `;
    el.appendChild(div);
  }
}

function renderTokensOnBoard(state) {
  // Clear all token containers
  document.querySelectorAll('.tokens-container').forEach(c => c.innerHTML = '');

  for (const p of state.players) {
    if (p.isBankrupt) continue;
    const container = document.getElementById(`tokens-${p.position}`);
    if (!container) continue;
    const span = document.createElement('span');
    span.className = 'board-token';
    span.title = p.username;
    span.textContent = AVATARS[p.avatar] || '🎩';
    container.appendChild(span);
  }
}

function renderBuildingsOnBoard(state) {
  // Clear
  document.querySelectorAll('.square-buildings').forEach(b => b.innerHTML = '');

  for (const [pos, prop] of Object.entries(state.properties)) {
    const el = document.getElementById(`bld-${pos}`);
    if (!el) continue;
    if (prop.hotel) {
      el.innerHTML = '<div class="hotel-dot" title="Hotel"></div>';
    } else if (prop.houses) {
      el.innerHTML = Array(prop.houses).fill('<div class="house-dot" title="House"></div>').join('');
    }
    // Mortgaged overlay
    const sqEl = document.getElementById(`sq-${pos}`);
    if (sqEl) {
      if (prop.mortgaged) sqEl.classList.add('mortgaged');
      else sqEl.classList.remove('mortgaged');
    }
  }
}

function renderTurnPanel(state) {
  const isMyTurn = state.currentPlayerId === currentUser.id;
  const me = state.players.find(p => p.userId === currentUser.id);
  const currentP = state.players.find(p => p.userId === state.currentPlayerId);

  const infoEl = document.getElementById('turn-info');
  const actEl = document.getElementById('action-buttons');

  if (state.state === 'lobby') {
    const isHost = state.players[0]?.userId === currentUser.id;
    infoEl.innerHTML = `
      <div style="font-weight:700;font-size:14px;margin-bottom:6px">🎲 Waiting room</div>
      <div style="color:var(--text2);font-size:12px">Players: ${state.players.length} / ${state.settings.maxPlayers}</div>
      <div style="margin-top:8px;font-size:12px">
        ${state.players.map(p => `<div style="padding:2px 0">${AVATARS[p.avatar]||'?'} ${escHtml(p.username)}</div>`).join('')}
      </div>
      ${isHost ? '' : '<div style="color:var(--text2);font-size:12px;margin-top:8px">Waiting for host to start...</div>'}
    `;
    if (isHost) {
      actEl.innerHTML = `<button class="btn-primary" id="start-game-btn" style="width:100%;padding:14px;font-size:16px">
        🚀 Start Game (${state.players.length} player${state.players.length > 1 ? 's' : ''})
      </button>`;
      // Attach after setting innerHTML
      const btn = document.getElementById('start-game-btn');
      if (btn) btn.onclick = () => { btn.disabled = true; btn.textContent = 'Starting...'; socket.emit('start_game'); };
    } else {
      actEl.innerHTML = '';
    }
    return;
  }

  if (state.state === 'ended') {
    infoEl.textContent = 'Game Over!';
    actEl.innerHTML = '';
    return;
  }

  if (!isMyTurn) {
    infoEl.innerHTML = `<span style="color:var(--accent)">${escHtml(currentP?.username || '?')}'s</span> turn`;
    actEl.innerHTML = '';
    // Add trade button if in game
    if (me && !me.isBankrupt && state.turnPhase !== 'auction') {
      actEl.innerHTML = `<button class="btn-sm" id="trade-btn">🤝 Propose Trade</button>`;
      document.getElementById('trade-btn').onclick = () => showTradeModal(state);
    }
    return;
  }

  // My turn
  let info = `Your turn — ${state.turnPhase}`;
  let buttons = [];

  if (state.turnPhase === 'roll') {
    info = 'Your turn — Roll the dice!';
    if (me.inJail) {
      buttons.push(`<button class="btn-primary" id="roll-btn">🎲 Roll (jail)</button>`);
      if (me.jailTurns === 0) {
        buttons.push(`<button class="btn-secondary" id="pay-jail-btn">💰 Pay $50 Fine</button>`);
        if (me.getOutOfJailCards > 0) {
          buttons.push(`<button class="btn-secondary" id="card-jail-btn">🃏 Use Card</button>`);
        }
      }
    } else {
      buttons.push(`<button class="btn-primary" id="roll-btn">🎲 Roll Dice</button>`);
    }
  }

  if (state.turnPhase === 'buy') {
    const pos = me.position;
    const sq = BOARD[pos];
    info = `Buy ${sq?.name} for $${sq?.price}?`;
    const canAfford = me.money >= (sq?.price || 0);
    buttons.push(`<button class="btn-primary" id="buy-btn" ${!canAfford ? 'disabled' : ''}>✅ Buy $${sq?.price}</button>`);
    buttons.push(`<button class="btn-secondary" id="decline-btn">❌ Decline${state.settings.auctionEnabled ? ' (Auction)' : ''}</button>`);
  }

  if (state.turnPhase === 'end_turn') {
    info = 'End your turn or manage properties.';
    buttons.push(`<button class="btn-primary" id="end-turn-btn">✔ End Turn</button>`);
    buttons.push(`<button class="btn-sm" id="trade-btn">🤝 Propose Trade</button>`);
    buttons.push(`<button class="btn-sm btn-danger" id="bankrupt-btn">🏳 Declare Bankruptcy</button>`);
  }

  infoEl.innerHTML = info;
  actEl.innerHTML = buttons.join('');

  // Bind
  document.getElementById('roll-btn')?.addEventListener('click', () => socket.emit('roll_dice'));
  document.getElementById('pay-jail-btn')?.addEventListener('click', () => socket.emit('pay_jail_fine'));
  document.getElementById('card-jail-btn')?.addEventListener('click', () => socket.emit('use_jail_card'));
  document.getElementById('buy-btn')?.addEventListener('click', () => socket.emit('buy_property'));
  document.getElementById('decline-btn')?.addEventListener('click', () => socket.emit('decline_buy'));
  document.getElementById('end-turn-btn')?.addEventListener('click', () => socket.emit('end_turn'));
  document.getElementById('trade-btn')?.addEventListener('click', () => showTradeModal(state));
  document.getElementById('bankrupt-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure? This will end your game.')) socket.emit('declare_bankruptcy');
  });
}

function renderMyProperties(state) {
  const me = state.players.find(p => p.userId === currentUser.id);
  if (!me) return;

  const el = document.getElementById('my-properties');
  el.innerHTML = '';

  const myProps = Object.entries(state.properties)
    .filter(([, p]) => p.ownerId === currentUser.id)
    .map(([pos]) => parseInt(pos));

  if (!myProps.length) {
    el.innerHTML = '<div style="color:var(--text2);font-size:12px">No properties owned</div>';
    return;
  }

  for (const pos of myProps.sort((a, b) => a - b)) {
    const sq = BOARD[pos];
    const prop = state.properties[pos];
    const div = document.createElement('div');
    div.className = 'my-prop-item';
    div.innerHTML = `
      <div class="prop-color-dot" style="background:${COLORS[sq.color] || '#888'}"></div>
      <div class="my-prop-name ${prop.mortgaged ? 'my-prop-mortgaged' : ''}">${sq.name}</div>
      <div class="my-prop-buildings">
        ${prop.hotel ? '🏨' : '🏠'.repeat(prop.houses || 0)}
        ${prop.mortgaged ? 'M' : ''}
      </div>
    `;
    div.onclick = () => showPropertyModal(pos, state);
    el.appendChild(div);
  }
}

function renderAuction(state) {
  const panel = document.getElementById('auction-panel');
  if (!state.auction) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  const a = state.auction;
  document.getElementById('auction-info').innerHTML = `
    <strong>${escHtml(a.propertyName)}</strong><br>
    Current bid: <strong>$${a.currentBid}</strong>
    ${a.highestBidderId ? ` by ${escHtml(state.players.find(p => p.userId === a.highestBidderId)?.username || '?')}` : ''}<br>
    <small style="color:var(--text2)">Your bids are anonymous until the auction ends.</small>
  `;
  const me = state.players.find(p => p.userId === currentUser.id);
  document.getElementById('bid-amount').placeholder = `Min: $${a.currentBid + 1}`;
  document.getElementById('place-bid-btn').onclick = () => {
    const amt = parseInt(document.getElementById('bid-amount').value);
    if (amt > 0) socket.emit('place_bid', { amount: amt });
  };
  const canEndAuction = state.currentPlayerId === currentUser.id;
  document.getElementById('end-auction-btn').style.display = canEndAuction ? 'block' : 'none';
  document.getElementById('end-auction-btn').onclick = () => socket.emit('end_auction');
}

function renderTrade(state) {
  const panel = document.getElementById('trade-panel');
  if (!state.tradeOffer || !state.tradeOffer.visible) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  const t = state.tradeOffer;
  const from = state.players.find(p => p.userId === t.fromUserId);
  const isRecipient = t.toUserId === currentUser.id;

  const getProps = (ids) => (ids || []).map(id => BOARD[id]?.name).join(', ') || 'None';

  document.getElementById('trade-info').innerHTML = `
    <strong>${escHtml(from?.username)}</strong> offers:<br>
    Give: $${t.offer.giveMoney || 0} + [${getProps(t.offer.giveProperties)}]<br>
    Get: $${t.offer.getMoney || 0} + [${getProps(t.offer.getProperties)}]
  `;

  const actEl = document.getElementById('trade-actions');
  if (isRecipient) {
    actEl.innerHTML = `
      <button class="btn-primary" id="accept-trade-btn">✅ Accept</button>
      <button class="btn-sm btn-danger" id="reject-trade-btn">❌ Reject</button>
    `;
    document.getElementById('accept-trade-btn').onclick = () => socket.emit('respond_trade', { accept: true });
    document.getElementById('reject-trade-btn').onclick = () => socket.emit('respond_trade', { accept: false });
  } else {
    actEl.innerHTML = '<div style="color:var(--text2);font-size:12px">Waiting for response...</div>';
  }
}

function renderLog(state) {
  const el = document.getElementById('game-log');
  el.innerHTML = '';
  const entries = state.log || [];
  for (const entry of entries.slice(-50)) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.textContent = entry.msg;
    el.appendChild(div);
  }
  el.scrollTop = el.scrollHeight;
}

function renderCenterNetWorths(state) {
  const el = document.getElementById('center-nw');
  if (!el) return;
  const worths = state.players.filter(p => !p.isBankrupt).map(p => p.netWorth);
  const max = Math.max(...worths, 1);
  el.innerHTML = state.players.map(p => `
    <div class="center-nw-row">
      <span style="font-size:12px">${AVATARS[p.avatar] || '?'}</span>
      <div class="nw-bar" style="width:${Math.round(Math.min(p.netWorth, max) / max * 80)}px"></div>
      <span style="font-size:10px;color:#333">$${formatMoney(p.netWorth)}</span>
    </div>
  `).join('');
}

// ─── Dice Animation ───────────────────────────────────────────────
const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function showDice(roll, username, event) {
  if (!roll) return;
  const overlay = document.getElementById('dice-overlay');
  overlay.classList.remove('hidden');
  document.getElementById('die1').textContent = DICE_FACES[roll.d1] || roll.d1;
  document.getElementById('die2').textContent = DICE_FACES[roll.d2] || roll.d2;
  let resultText = `${username}: ${roll.d1} + ${roll.d2} = ${roll.total}`;
  if (roll.isDoubles) resultText += ' 🎉 Doubles!';
  document.getElementById('dice-result-text').textContent = resultText;

  setTimeout(() => overlay.classList.add('hidden'), 1800);
}

// ─── Square Click ─────────────────────────────────────────────────
function onSquareClick(pos) {
  if (!gameState) return;
  const prop = gameState.properties[pos];
  if (prop) showPropertyModal(pos, gameState);
}

function showPropertyModal(pos, state) {
  const sq = BOARD[pos];
  if (!sq) return;
  const prop = state.properties[pos];
  const owner = prop ? state.players.find(p => p.userId === prop.ownerId) : null;
  const isMe = prop?.ownerId === currentUser.id;
  const me = state.players.find(p => p.userId === currentUser.id);

  document.getElementById('prop-modal-name').textContent = sq.name;
  document.getElementById('prop-modal').classList.remove('hidden');

  let content = '';
  if (sq.color) {
    content += `<div class="prop-color-header" style="background:${COLORS[sq.color]}"></div>`;
  }
  if (sq.price) content += `<p>Price: <strong>$${sq.price}</strong></p>`;
  if (owner) content += `<p>Owner: <strong>${escHtml(owner.username)}</strong></p>`;
  if (prop?.mortgaged) content += `<p style="color:var(--text2)">⚠️ Mortgaged</p>`;
  if (prop?.houses) content += `<p>Houses: ${'🏠'.repeat(prop.houses)}</p>`;
  if (prop?.hotel) content += `<p>Hotel: 🏨</p>`;

  // Rent table for properties
  if (sq.type === 'property' && sq.rent) {
    // We need rent data — it's on the server, let's show from known board
    // (we don't store rent in client board for brevity — show placeholder)
    content += `<table class="prop-rent-table">
      <tr><td>Rent (no buildings)</td><td>per board data</td></tr>
    </table>`;
  }

  document.getElementById('prop-modal-content').innerHTML = content;

  // Actions
  const actEl = document.getElementById('prop-modal-actions');
  actEl.innerHTML = '';
  const isMyTurn = state.currentPlayerId === currentUser.id;

  if (isMe && me && !me.isBankrupt) {
    if (!prop.mortgaged) {
      if (sq.type === 'property') {
        const buildBtn = document.createElement('button');
        buildBtn.className = 'btn-primary';
        buildBtn.textContent = prop.hotel ? '✅ Max Built' : '🏗 Build House';
        buildBtn.disabled = !!prop.hotel;
        buildBtn.onclick = () => { socket.emit('build_house', { pos }); document.getElementById('prop-modal').classList.add('hidden'); };
        actEl.appendChild(buildBtn);

        if (prop.houses > 0 || prop.hotel) {
          const sellBtn = document.createElement('button');
          sellBtn.className = 'btn-secondary';
          sellBtn.textContent = '💰 Sell Building';
          sellBtn.onclick = () => { socket.emit('sell_house', { pos }); document.getElementById('prop-modal').classList.add('hidden'); };
          actEl.appendChild(sellBtn);
        }
      }

      const mortBtn = document.createElement('button');
      mortBtn.className = 'btn-sm';
      mortBtn.textContent = '📋 Mortgage';
      mortBtn.onclick = () => { socket.emit('mortgage', { pos }); document.getElementById('prop-modal').classList.add('hidden'); };
      actEl.appendChild(mortBtn);
    } else {
      const unmortBtn = document.createElement('button');
      unmortBtn.className = 'btn-sm';
      unmortBtn.textContent = '🔓 Unmortgage';
      unmortBtn.onclick = () => { socket.emit('unmortgage', { pos }); document.getElementById('prop-modal').classList.add('hidden'); };
      actEl.appendChild(unmortBtn);
    }
  }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-secondary';
  closeBtn.textContent = 'Close';
  closeBtn.onclick = () => document.getElementById('prop-modal').classList.add('hidden');
  actEl.appendChild(closeBtn);

  document.getElementById('close-prop-modal').onclick = () => document.getElementById('prop-modal').classList.add('hidden');
}

// ─── Trade Modal ──────────────────────────────────────────────────
function showTradeModal(state) {
  const me = state.players.find(p => p.userId === currentUser.id);
  if (!me) return;

  const others = state.players.filter(p => p.userId !== currentUser.id && !p.isBankrupt);
  if (!others.length) { showNotif('No players to trade with', 'error'); return; }

  const myProps = Object.entries(state.properties)
    .filter(([, p]) => p.ownerId === currentUser.id && !p.mortgaged)
    .map(([pos]) => parseInt(pos));

  document.getElementById('trade-modal').classList.remove('hidden');

  let selectedTo = others[0].userId;
  let giveMoney = 0;
  let getMoney = 0;
  let giveProps = [];
  let getProps = [];

  const render = () => {
    const theirProps = Object.entries(state.properties)
      .filter(([, p]) => p.ownerId === selectedTo && !p.mortgaged)
      .map(([pos]) => parseInt(pos));

    document.getElementById('trade-modal-content').innerHTML = `
      <div style="margin-bottom:12px">
        <label style="font-size:13px;color:var(--text2)">Trade with:</label>
        <select id="trade-target" style="width:100%;margin-top:4px">
          ${others.map(p => `<option value="${p.userId}" ${p.userId === selectedTo ? 'selected' : ''}>${escHtml(p.username)}</option>`).join('')}
        </select>
      </div>
      <div class="trade-cols">
        <div class="trade-col">
          <h4>You Give</h4>
          <label style="font-size:12px">Money: $<input type="number" id="give-money" value="${giveMoney}" min="0" max="${me.money}" style="width:80px"></label>
          <div style="margin-top:8px;font-size:12px;color:var(--text2)">Properties:</div>
          ${myProps.map(pos => `
            <label class="trade-prop-checkbox">
              <input type="checkbox" data-pos="${pos}" class="give-prop" ${giveProps.includes(pos) ? 'checked' : ''}>
              <span class="prop-color-dot" style="background:${COLORS[BOARD[pos].color]}"></span>
              ${BOARD[pos].name}
            </label>`).join('') || '<div style="color:var(--text2);font-size:12px">No properties</div>'}
        </div>
        <div class="trade-col">
          <h4>You Get</h4>
          <label style="font-size:12px">Money: $<input type="number" id="get-money" value="${getMoney}" min="0" style="width:80px"></label>
          <div style="margin-top:8px;font-size:12px;color:var(--text2)">Properties:</div>
          ${theirProps.map(pos => `
            <label class="trade-prop-checkbox">
              <input type="checkbox" data-pos="${pos}" class="get-prop" ${getProps.includes(pos) ? 'checked' : ''}>
              <span class="prop-color-dot" style="background:${COLORS[BOARD[pos].color]}"></span>
              ${BOARD[pos].name}
            </label>`).join('') || '<div style="color:var(--text2);font-size:12px">No properties</div>'}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn-primary" id="send-trade-btn">📤 Send Offer</button>
        <button class="btn-secondary" id="cancel-trade-btn">Cancel</button>
      </div>
    `;

    document.getElementById('trade-target').onchange = (e) => { selectedTo = parseInt(e.target.value); render(); };
    document.getElementById('give-money').onchange = (e) => { giveMoney = parseInt(e.target.value) || 0; };
    document.getElementById('get-money').onchange = (e) => { getMoney = parseInt(e.target.value) || 0; };
    document.querySelectorAll('.give-prop').forEach(cb => {
      cb.onchange = () => {
        const pos = parseInt(cb.dataset.pos);
        if (cb.checked) giveProps.push(pos);
        else giveProps = giveProps.filter(p => p !== pos);
      };
    });
    document.querySelectorAll('.get-prop').forEach(cb => {
      cb.onchange = () => {
        const pos = parseInt(cb.dataset.pos);
        if (cb.checked) getProps.push(pos);
        else getProps = getProps.filter(p => p !== pos);
      };
    });
    document.getElementById('send-trade-btn').onclick = () => {
      socket.emit('offer_trade', {
        toUserId: selectedTo,
        offer: { giveMoney, getMoney, giveProperties: giveProps, getProperties: getProps }
      });
      document.getElementById('trade-modal').classList.add('hidden');
    };
    document.getElementById('cancel-trade-btn').onclick = () => document.getElementById('trade-modal').classList.add('hidden');
  };

  render();
  document.getElementById('close-trade-modal').onclick = () => document.getElementById('trade-modal').classList.add('hidden');
}

// ─── Profile ──────────────────────────────────────────────────────
async function showProfile() {
  document.getElementById('profile-modal').classList.remove('hidden');
  document.getElementById('profile-content').innerHTML = '<div style="color:var(--text2)">Loading...</div>';

  try {
    const res = await fetch('/api/stats/me/full', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.stats) throw new Error('No stats');
    const s = data.stats;
    const wr = s.games_played > 0 ? Math.round(s.games_won / s.games_played * 100) : 0;

    document.getElementById('profile-content').innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <span style="font-size:48px">${AVATARS[s.avatar] || '🎩'}</span>
        <div>
          <div style="font-size:22px;font-weight:700">${escHtml(s.username)}</div>
          <div style="color:var(--text2);font-size:13px">Member since ${new Date(s.created_at * 1000).toLocaleDateString()}</div>
        </div>
      </div>
      <div class="profile-stats-grid">
        <div class="stat-card"><div class="stat-value">${s.games_played}</div><div class="stat-label">Games Played</div></div>
        <div class="stat-card"><div class="stat-value">${s.games_won}</div><div class="stat-label">Games Won</div></div>
        <div class="stat-card"><div class="stat-value">${wr}%</div><div class="stat-label">Win Rate</div></div>
        <div class="stat-card"><div class="stat-value">${s.bankrupt_count}</div><div class="stat-label">Bankruptcies</div></div>
        <div class="stat-card"><div class="stat-value">$${formatMoney(s.total_money_earned)}</div><div class="stat-label">Total Earned</div></div>
        <div class="stat-card"><div class="stat-value">${s.total_properties_bought}</div><div class="stat-label">Properties Bought</div></div>
        <div class="stat-card"><div class="stat-value">$${formatMoney(s.total_rent_collected)}</div><div class="stat-label">Rent Collected</div></div>
        <div class="stat-card"><div class="stat-value">${s.monopolies_formed}</div><div class="stat-label">Monopolies</div></div>
        <div class="stat-card"><div class="stat-value">${s.hotels_built}</div><div class="stat-label">Hotels Built</div></div>
        <div class="stat-card"><div class="stat-value">${s.longest_game_minutes}m</div><div class="stat-label">Longest Game</div></div>
      </div>
    `;
  } catch (e) {
    document.getElementById('profile-content').innerHTML = '<div style="color:var(--danger)">Failed to load profile</div>';
  }
}

// ─── Winner Modal ─────────────────────────────────────────────────
function showWinnerModal(winner, state) {
  document.getElementById('winner-modal').classList.remove('hidden');
  document.getElementById('winner-name').textContent = winner ? winner.username : 'Nobody';
  document.getElementById('winner-subtitle').textContent = winner?.userId === currentUser.id
    ? '🎊 You won! Congratulations!' : `Better luck next time!`;

  const statsEl = document.getElementById('final-stats');
  const netWorths = (state.players || []).sort((a, b) => b.netWorth - a.netWorth);
  statsEl.innerHTML = netWorths.map((p, i) => `
    <div class="final-stat-row">
      <span>${i + 1}. ${AVATARS[p.avatar] || '?'} ${escHtml(p.username)}</span>
      <span>$${formatMoney(p.netWorth)}</span>
    </div>
  `).join('');

  document.getElementById('back-to-lobby-btn').onclick = () => {
    document.getElementById('winner-modal').classList.add('hidden');
    socket.emit('leave_room');
    gameState = null;
    gameId = null;
    showScreen('lobby');
    socket.emit('get_rooms');
    loadLeaderboard('wins');
  };
}

// ─── Leave Game ───────────────────────────────────────────────────
document.getElementById('leave-game-btn').onclick = () => {
  if (!confirm('Leave the game?')) return;
  socket.emit('leave_room');
  gameState = null;
  gameId = null;
  showScreen('lobby');
  socket.emit('get_rooms');
};

// ─── Chat ─────────────────────────────────────────────────────────
document.getElementById('chat-send-btn').onclick = sendChat;
document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});

function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !socket) return;
  socket.emit('chat_message', { text });
  input.value = '';
}

// ─── Notifications ────────────────────────────────────────────────
let notifTimeout;
function showNotif(msg, type = 'info') {
  let notif = document.getElementById('notif-banner');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'notif-banner';
    notif.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;transition:opacity 0.3s';
    document.body.appendChild(notif);
  }
  notif.textContent = msg;
  notif.style.background = type === 'error' ? '#e05555' : '#4caf7d';
  notif.style.color = 'white';
  notif.style.opacity = '1';
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => notif.style.opacity = '0', 3000);
}

function showGameNotif(msg) { showNotif(msg, 'info'); }

// ─── Utilities ────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatMoney(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n || 0);
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  return res.json();
}
