// Import configuration
import { CONFIG } from './config.js';

// ===== BINGO TRACKING SYSTEM (Removed) =====
// The interactive bingo tracking system has been removed.
// A new function will be added to show a homage to the bingo event.

// --- Dynamic player loading (no hardcoded names) --- lol
// Caches to avoid refetching
const playerCache = new Map();   // name -> parsed JSON
const missingCache = new Set();  // names known to not have a JSON file
const memoCache = new Map();     // Memoization cache for expensive calculations
let lastCacheTime = 0;           // Timestamp for cache invalidation
async function loadPlayers() {
  // expects ./data/players.json -> ["name1", "name2", ...]
  const res = await fetch('./data/players.json');
  if (!res.ok) {
    throw new Error(`Failed to load players.json: ${res.status}`);
  }
  const arr = await res.json();
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error('players.json must be a non-empty array of player names');
  }
  return arr;
}

// Dynamic colors for leaders (assigned after players load)
const leaderColors = {};
function assignColors(players) {
  players.forEach((p, i) => {
    leaderColors[p] = CONFIG.COLOR_PALETTE[i % CONFIG.COLOR_PALETTE.length];
  });
}
// --- Optional per-player small icons next to names (externalizable) ---
// This object will be populated at runtime by merging defaults with an optional JSON file.
let PLAYER_ICONS = { ...CONFIG.DEFAULT_PLAYER_ICONS };

// Optionally load overrides from ./data/player_icons.json
// Expected shape: { "vaopa": "./images/gim.png", "alice": "./images/iconX.png" }
async function loadPlayerIconsFromJson(url = './data/player_icons.json') {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const obj = await res.json();
    if (obj && typeof obj === 'object') {
      const normalized = {};
      Object.keys(obj).forEach(k => {
        normalized[String(k).toLowerCase()] = obj[k];
      });
      PLAYER_ICONS = { ...CONFIG.DEFAULT_PLAYER_ICONS, ...normalized };
    }
  } catch (e) {
    console.warn('PLAYER_ICONS: using defaults; failed to load external mapping:', e);
  }
}

function getPlayerIcon(name) {
  if (!name) return null;
  return PLAYER_ICONS[String(name).toLowerCase()] || null;
}

function createPlayerNameNode(name) {
  const wrap = document.createElement('span');
  wrap.textContent = name || '';
  const icon = getPlayerIcon(name);
  if (icon) {
    const img = document.createElement('img');
    img.src = icon;
    img.alt = 'icon';
    img.style.width = '16px';
    img.style.height = '16px';
    img.style.verticalAlign = 'middle';
    img.style.marginLeft = '6px';
    wrap.appendChild(img);
  }
  return wrap;
}

// Pretty display names for certain minigame keys
function prettyName(name) {
  return CONFIG.DISPLAY_NAMES[name] || name;
}

// --- Show/Hide Rank preference ---
function getShowRankPref() {
  return localStorage.getItem('showRank') === '1';
}

function getRankToggleTargets() {
  return [document.body, document.querySelector('.container')].filter(Boolean);
}

function setShowRankPref(on) {
  localStorage.setItem('showRank', on ? '1' : '0');
  getRankToggleTargets().forEach(el => el.classList.toggle('show-ranks', on));
}

function getShowBingoPref() {
  return localStorage.getItem('showBingo') === '1';
}

function setShowBingoPref(on) {
  localStorage.setItem('showBingo', on ? '1' : '0');
  document.body.classList.toggle('show-bingo', on);
}



function applyRankPref() {
  const on = getShowRankPref();
  getRankToggleTargets().forEach(el => el.classList.toggle('show-ranks', on));
}

// --- Virtual level helpers (OSRS) ---
// Build XP thresholds for levels 1..126 using the standard OSRS formula
function buildXpThresholds(maxLevel = 126) {
  const thresholds = [0]; // index 0 unused; thresholds[1] = 0 XP
  let points = 0;
  thresholds[1] = 0;
  for (let lvl = 2; lvl <= maxLevel; lvl++) {
    points += Math.floor((lvl - 1) + 300 * Math.pow(2, (lvl - 1) / 7));
    thresholds[lvl] = Math.floor(points / 4);
  }
  return thresholds;
}

const OSRS_XP_THRESHOLDS = buildXpThresholds(126);

// ---- Refresh banner helpers (Europe/Helsinki @ 06:00 daily) ----
function getHelsinkiOffset(now = new Date()) {
  // e.g., "GMT+2" or "UTC+3" -> extract +2 / +3
  const s = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Helsinki',
    timeZoneName: 'shortOffset',
    hour: '2-digit'
  }).format(now);
  const m = s.match(/([+-]\d{1,2})/);
  if (!m) return '+02:00'; // safe default
  const signNum = m[1];
  const abs = Math.abs(parseInt(signNum, 10));
  const sign = signNum.startsWith('-') ? '-' : '+';
  const hh = String(abs).padStart(2, '0');
  return `${sign}${hh}:00`;
}

function nextHelsinkiSix(now = new Date()) {
  // Get today's date in Helsinki
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(now).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  const helHour = parseInt(parts.hour, 10);
  const offset = getHelsinkiOffset(now);

  // If already past 06:00 Helsinki today, schedule tomorrow
  let y = parts.year, m = parts.month, d = parts.day;
  if (helHour >= 6) {
    // bump date by one day in Helsinki
    const helDateStr = `${parts.year}-${parts.month}-${parts.day}T12:00:00${offset}`; // 12 keeps us safely in the same day in Helsinki
    const helNoon = new Date(helDateStr);
    const tomorrow = new Date(helNoon.getTime() + 24 * 60 * 60 * 1000);
    const tparts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Helsinki',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(tomorrow).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
    y = tparts.year; m = tparts.month; d = tparts.day;
  }
  return new Date(`${y}-${m}-${d}T06:00:00${offset}`);
}

function timeAgo(fromDate, toDate = new Date()) {
  const ms = Math.max(0, toDate - fromDate);
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatLocal(dt) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false
  }).format(dt);
}

function formatInHelsinki(dt) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Helsinki',
    timeZoneName: 'short'
  }).format(dt);
}

function timeUntil(toDate, fromDate = new Date()) {
  const ms = Math.max(0, toDate - fromDate);
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'less than a minute';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}



function renderRefreshPill(lastIso) {
  const container = document.querySelector('.container') || document.body;
  
  // Try to find existing pill
  let wrap = document.querySelector('.refresh-pill');
  let isNew = false;
  
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'refresh-pill';
    isNew = true;
  }

  // last refresh (relative only)
  let lastStr = 'unknown';
  if (lastIso) {
    const lastDate = new Date(lastIso);
    lastStr = timeAgo(lastDate);
  }

  // next refresh (relative only)
  const next = nextHelsinkiSix();
  const untilStr = timeUntil(next);

  // Create or update refresh info container
  let refreshInfo = wrap.querySelector('.refresh-info');
  if (!refreshInfo) {
    refreshInfo = document.createElement('div');
    refreshInfo.className = 'refresh-info';
  }

  // Update or create Last refresh section
  let lastSpan = refreshInfo.querySelector('.refresh-piece:first-of-type');
  if (!lastSpan) {
    lastSpan = document.createElement('div');
    lastSpan.className = 'refresh-piece';
    lastSpan.innerHTML = '<span class="refresh-emoji">\u23F0</span><strong>Last Update</strong><span class="time-value"></span>';
  }
  const lastValue = lastSpan.querySelector('.time-value');
  if (lastValue) lastValue.textContent = lastStr;

  let dot = refreshInfo.querySelector('.dot');
  if (!dot) {
    dot = document.createElement('span');
    dot.className = 'dot';
    dot.setAttribute('aria-hidden', 'true');
  }

  // Update or create Next refresh section
  let nextSpan = refreshInfo.querySelector('.refresh-piece:last-of-type');
  if (!nextSpan) {
    nextSpan = document.createElement('div');
    nextSpan.className = 'refresh-piece';
    nextSpan.innerHTML = '<span class="refresh-emoji">\u23F3</span><strong>Next Update</strong><span class="time-value"></span>';
  }
  const nextValue = nextSpan.querySelector('.time-value');
  if (nextValue) nextValue.textContent = 'in ' + untilStr;

  // Rank toggle button
  let toggleBtn = wrap.querySelector('#rankToggle');
  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.id = 'rankToggle'; 
    toggleBtn.className = 'rank-toggle';
    toggleBtn.addEventListener('click', () => {
      const nowOn = !getShowRankPref();
      setShowRankPref(nowOn);
      toggleBtn.innerHTML = nowOn ? '👁️ Hide Ranks' : '👁️ Show Ranks';
    });
  }
  const startOn = getShowRankPref();
  toggleBtn.innerHTML = startOn ? '👁️ Hide Ranks' : '👁️ Show Ranks';

  // Bingo toggle button
  let bingoBtn = wrap.querySelector('#bingoToggle');
  if (!bingoBtn) {
    bingoBtn = document.createElement('button');
    bingoBtn.type = 'button';
    bingoBtn.id = 'bingoToggle';
    bingoBtn.className = 'bingo-toggle';
    bingoBtn.addEventListener('click', () => {
      const nowOn = !getShowBingoPref();
      setShowBingoPref(nowOn);
      bingoBtn.innerHTML = nowOn ? '🎯 Hide Bingo' : '🎯 Show Bingo';
    });
  }
  const bingoOn = getShowBingoPref();
  bingoBtn.innerHTML = bingoOn ? '🎯 Hide Bingo' : '🎯 Show Bingo';

  // Rebuild structure if new
  if (isNew) {
    refreshInfo.appendChild(lastSpan);
    refreshInfo.appendChild(dot);
    refreshInfo.appendChild(nextSpan);
    wrap.appendChild(refreshInfo);
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'refresh-buttons';
    buttonContainer.appendChild(toggleBtn);
    buttonContainer.appendChild(bingoBtn);
    wrap.appendChild(buttonContainer);
    
    // Insert just below the intro/banner (if present), else at top
    const intro = document.querySelector('.intro-box');
    if (intro && intro.parentNode) {
      intro.parentNode.insertBefore(wrap, intro.nextSibling);
    } else {
      container.prepend(wrap);
    }
  }
}

function renderBingoHomageSection() {
  const container = document.querySelector('.container') || document.body;

  let bingoSection = document.createElement('div');
  bingoSection.className = 'bingo-section';

  const img = document.createElement('img');
  img.src = './images/bingo_over.png';
  img.alt = 'Bingo Homage';
  img.style.maxWidth = '100%';
  img.style.borderRadius = '8px';

  const text = document.createElement('p');
text.style.color = '#f5f5f5';
text.style.textAlign = 'center';

  bingoSection.appendChild(img);
  bingoSection.appendChild(text);

  const refreshPill = document.querySelector('.refresh-pill');
  if (refreshPill && refreshPill.parentNode) {
    refreshPill.parentNode.insertBefore(bingoSection, refreshPill.nextSibling);
  } else {
    container.prepend(bingoSection);
  }
}

// --- Collapsible sections (minimal change) ---
function injectCollapsibleStyles() {
  if (document.getElementById('collapsible-style')) return;
  const style = document.createElement('style');
  style.id = 'collapsible-style';
  style.textContent = `
    .category-box.collapsed > *:not(h2) { display: none !important; }
    .category-box > h2 { cursor: pointer; }
  `;
  document.head.appendChild(style);
}

function makeCollapsible(box, keyHint) {
  const header = box.querySelector('h2');
  if (!header) return;

  const storageKey = `collapse:${keyHint || header.textContent.trim()}`;
  header.setAttribute('role', 'button');
  header.setAttribute('tabindex', '0');

  const apply = () => {
    const collapsed = localStorage.getItem(storageKey) === '1';
    box.classList.toggle('collapsed', collapsed);
    header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  };

  const toggle = () => {
    const now = !(localStorage.getItem(storageKey) === '1');
    localStorage.setItem(storageKey, now ? '1' : '0');
    apply();
  };

  header.addEventListener('click', toggle);
  header.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });

  apply();
}

function xpToVirtualLevel(xp) {
  // Find highest level such that xp >= threshold
  let lvl = 1;
  for (let i = 2; i < OSRS_XP_THRESHOLDS.length; i++) {
    if (xp >= OSRS_XP_THRESHOLDS[i]) {
      lvl = i;
    } else {
      break;
    }
  }
  return lvl;
}

function getDisplayedLevel(skillName, storedLevel, storedXp) {
  // Overall should keep the stored level; others use virtual levels from XP
  if (skillName === 'Overall') return storedLevel;
  return xpToVirtualLevel(storedXp);
}

// Category definitions from config
const CUSTOM_CATEGORIES = CONFIG.CUSTOM_CATEGORIES;

// --- Data helpers ---
function filenameCandidates(playerName) {
  const trimmed = (playerName || '').trim();

  // collapse consecutive spaces
  const collapsed = trimmed.replace(/\s+/g, ' ');

  const underscore = collapsed.replace(/ /g, '_');
  const pluses     = collapsed.replace(/ /g, '+');

  // Some setups might already have underscores, keep both
  const candidates = [collapsed, underscore, pluses];

  // Also try lowercased variants (just in case files were saved lowercased)
  const lower = collapsed.toLowerCase();
  candidates.push(lower, lower.replace(/ /g, '_'), lower.replace(/ /g, '+'));

  // De-duplicate while preserving order
  return [...new Set(candidates)];
}

async function fetchPlayerData(playerName) {
  const cached = playerCache.get(playerName);
  if (cached) return cached;
  if (missingCache.has(playerName)) {
    throw new Error(`Previously missing: ${playerName}`);
  }

  const candidates = filenameCandidates(playerName);
  let lastStatus = null;

  for (const base of candidates) {
    const url = `./data/${encodeURIComponent(base)}.json`;
    try {
      const resp = await fetch(url, { cache: 'no-cache' });
      if (resp.ok) {
        const data = await resp.json();
        playerCache.set(playerName, data);
        return data;
      } else {
        lastStatus = resp.status;
      }
    } catch (e) {
      // ignore and try next candidate
    }
  }

  // Mark as missing to avoid trying again during this page session
  missingCache.add(playerName);
  throw new Error(`Failed to load JSON for "${playerName}". Tried: ${candidates.join(', ')}${lastStatus ? ` (last status ${lastStatus})` : ''}`);
}


// --- Reusable Leader Table Rendering ---
function createLeaderTable(topNData, options = {}) {
  const {
    iconMap = {},
    isSkillTable = false,
    valueLabel = 'Score',
    valueFormatter = (val) => val.toLocaleString()
  } = options;

  const table = document.createElement('table');
  table.border = '1';
  table.style.width = '100%';

  const headerRow = document.createElement('tr');
  const headers = ['Item', 'Leader', 'Rank', valueLabel];
  headers.forEach((text, idx) => {
    const th = document.createElement('th');
    th.textContent = text;
    if (idx === 2) {
      th.classList.add('col-rank');
      th.setAttribute('data-col', 'rank');
    }
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  Object.entries(topNData).forEach(([itemName, topN]) => {
    if (!Array.isArray(topN) || topN.length === 0) return;
    const leader = topN[0];

    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.title = 'Click to see runner-ups';
    row.classList.add('leader-row');

    const itemCell = document.createElement('td');
    const img = document.createElement('img');
    const iconPath = iconMap[itemName] || `./images/${itemName} icon.png`;
    img.src = isSkillTable ? iconPath : encodeURI(iconPath);
    img.alt = `${prettyName(itemName)} Icon`;
    img.style.width = '24px';
    img.style.height = '24px';
    img.style.verticalAlign = 'middle';
    img.style.marginRight = '8px';
    img.classList.add('item-icon');
    itemCell.appendChild(img);
    itemCell.appendChild(document.createTextNode(isSkillTable ? itemName : prettyName(itemName)));
    row.appendChild(itemCell);

    const playerCell = document.createElement('td');
    playerCell.style.color = leaderColors[leader.player] || 'black';
    playerCell.style.fontWeight = 'bold';
    playerCell.appendChild(createPlayerNameNode(leader.player));
    row.appendChild(playerCell);

    const rankCell = document.createElement('td');
    rankCell.classList.add('col-rank');
    rankCell.setAttribute('data-col', 'rank');
    const rnk = (typeof leader.rank === 'number') ? `#${leader.rank.toLocaleString()}` : '';
    rankCell.textContent = rnk;
    row.appendChild(rankCell);

    const valueCell = document.createElement('td');
    valueCell.textContent = valueFormatter(isSkillTable ? leader.level : leader.score);
    row.appendChild(valueCell);

    const detailRow = createRunnerUpsRow(topN.slice(1), valueLabel, valueFormatter, isSkillTable);
    
    row.addEventListener('click', () => {
      detailRow.style.display = (detailRow.style.display === 'none') ? '' : 'none';
    });

    table.appendChild(row);
    table.appendChild(detailRow);
  });

  return table;
}

function createRunnerUpsRow(runnerUps, valueLabel, valueFormatter, isSkillTable) {
  const detailRow = document.createElement('tr');
  const detailCell = document.createElement('td');
  detailCell.colSpan = 4;
  detailRow.style.display = 'none';
  detailRow.classList.add('runner-ups-row');

  const inner = document.createElement('div');
  inner.style.padding = '8px 12px';
  inner.style.background = 'rgba(0,0,0,0.03)';
  inner.style.borderLeft = '3px solid #ddd';

  const list = document.createElement('table');
  list.style.width = '100%';
  list.style.fontSize = '0.95em';

  const rh = document.createElement('tr');
  ['#', 'Player', 'Rank', valueLabel].forEach((text, idx) => {
    const th = document.createElement('th');
    th.textContent = text;
    if (idx === 2) {
      th.classList.add('col-rank');
      th.setAttribute('data-col', 'rank');
    }
    rh.appendChild(th);
  });
  list.appendChild(rh);

  runnerUps.forEach((entry, idx) => {
    const r = document.createElement('tr');
    const cPos = document.createElement('td');
    cPos.textContent = (idx + 2).toString();
    r.appendChild(cPos);

    const cName = document.createElement('td');
    cName.style.fontWeight = '500';
    cName.style.color = leaderColors[entry.player] || 'black';
    cName.appendChild(createPlayerNameNode(entry.player));
    r.appendChild(cName);

    const cRank = document.createElement('td');
    cRank.classList.add('col-rank');
    cRank.setAttribute('data-col', 'rank');
    cRank.textContent = (typeof entry.rank === 'number') ? `#${entry.rank.toLocaleString()}` : '';
    r.appendChild(cRank);

    const cValue = document.createElement('td');
    cValue.textContent = valueFormatter(isSkillTable ? entry.level : entry.score);
    r.appendChild(cValue);

    list.appendChild(r);
  });

  inner.appendChild(list);
  detailCell.appendChild(inner);
  detailRow.appendChild(detailCell);

  return detailRow;
}

// --- Memoization helper ---
function memoize(fn, keyFn, ttl = CONFIG.CACHE_DURATION_MS) {
  return async function(...args) {
    const key = keyFn(...args);
    const now = Date.now();
    
    if (memoCache.has(key)) {
      const { value, timestamp } = memoCache.get(key);
      if (now - timestamp < ttl) {
        return value;
      }
    }
    
    const value = await fn(...args);
    memoCache.set(key, { value, timestamp: now });
    return value;
  };
}

// Build Top-N per skill (using virtual levels for non-Overall)
async function getTopNSkillLeadersRaw(players, N = 5) {
  const results = await Promise.allSettled(players.map(fetchPlayerData));
  const ok = [];
  const okNames = [];
  results.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      ok.push(res.value);
      okNames.push(players[idx]);
    }
  });
  if (ok.length === 0) {
    throw new Error('No player JSONs could be loaded.');
  }

  const latestSnapshots = ok.map(p => p.snapshots[p.snapshots.length - 1]);
  // Build a union of all skills across players to handle cases where the first player is missing a key (e.g., new skills like Sailing)
  const skillSet = new Set();
  latestSnapshots.forEach(snap => {
    const sk = (snap && snap.skills) ? snap.skills : {};
    Object.keys(sk).forEach(k => skillSet.add(k));
  });
  const skills = Array.from(skillSet);

  const topMap = {}; // skill -> [{ player, level, rank }... ]

  skills.forEach(skill => {
    const entries = [];
    latestSnapshots.forEach((snap, idx) => {
      const s = snap.skills[skill] || {};
      const level = (skill === 'Overall')
        ? (s.level ?? 0) // keep stored level for Overall
        : getDisplayedLevel(skill, s.level, s.experience);
      const rank = (typeof s.rank === 'number') ? s.rank : null;
      entries.push({ player: okNames[idx], level, rank });
    });

    // Sort: higher level first; tie-break by better (lower) rank
    entries.sort((a, b) => (b.level - a.level) || ((a.rank ?? Infinity) - (b.rank ?? Infinity)));
    topMap[skill] = entries.slice(0, N);
  });

  return topMap;
}

// Memoized version
const getTopNSkillLeaders = memoize(
  getTopNSkillLeadersRaw,
  (players, N) => `skills:${players.join(',')}:${N}`
);

async function displayHighestLevels(players) {
  const topNMap = await getTopNSkillLeaders(players, CONFIG.TOP_N_LEADERS);

  const skillIcons = CONFIG.SKILL_ICONS;

  const table = document.createElement('table');
  table.border = '1';
  table.style.width = '100%';

  const headerRow = document.createElement('tr');
  const hdrSkill = document.createElement('th');
  hdrSkill.textContent = 'Skill';
  headerRow.appendChild(hdrSkill);

  const hdrLeader = document.createElement('th');
  hdrLeader.textContent = 'Leader';
  headerRow.appendChild(hdrLeader);

  const hdrRank = document.createElement('th');
  hdrRank.textContent = 'Rank';
  hdrRank.classList.add('col-rank');
  hdrRank.setAttribute('data-col', 'rank');
  headerRow.appendChild(hdrRank);

  const hdrLevel = document.createElement('th');
  hdrLevel.textContent = 'Level';
  headerRow.appendChild(hdrLevel);

  table.appendChild(headerRow);

  Object.entries(topNMap).forEach(([skill, topN]) => {
    if (!Array.isArray(topN) || topN.length === 0) return;
    const leader = topN[0];

    // Visible leader row
    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.title = 'Click to see runner-ups';

    const skillCell = document.createElement('td');
    const skillIcon = document.createElement('img');
    skillIcon.src = skillIcons[skill] || './images/default-icon.png';
    skillIcon.alt = `${skill} Icon`;
    skillIcon.style.width = '24px';
    skillIcon.style.height = '24px';
    skillIcon.style.verticalAlign = 'middle';
    skillIcon.style.marginRight = '8px';
    skillCell.appendChild(skillIcon);
    skillCell.appendChild(document.createTextNode(skill));
    row.appendChild(skillCell);

    const playerCell = document.createElement('td');
    playerCell.style.color = leaderColors[leader.player] || 'black';
    playerCell.style.fontWeight = 'bold';
    playerCell.appendChild(createPlayerNameNode(leader.player));
    row.appendChild(playerCell);

    const rankCell = document.createElement('td');
    rankCell.classList.add('col-rank');
    rankCell.setAttribute('data-col', 'rank');
    const rnk = (typeof leader.rank === 'number') ? `#${leader.rank.toLocaleString()}` : '';
    rankCell.textContent = rnk;
    row.appendChild(rankCell);

    const levelCell = document.createElement('td');
    levelCell.textContent = leader.level;
    row.appendChild(levelCell);

    // Hidden runner-ups row (#2..#5)
    const detailRow = document.createElement('tr');
    const detailCell = document.createElement('td');
    detailCell.colSpan = 4;
    detailRow.style.display = 'none';

    const inner = document.createElement('div');
    inner.style.padding = '8px 12px';
    inner.style.background = 'rgba(0,0,0,0.03)';
    inner.style.borderLeft = '3px solid #ddd';

    const list = document.createElement('table');
    list.style.width = '100%';
    list.style.fontSize = '0.95em';

    const rh = document.createElement('tr');
    const rhPos = document.createElement('th'); rhPos.textContent = '#'; rh.appendChild(rhPos);
    const rhName = document.createElement('th'); rhName.textContent = 'Player'; rh.appendChild(rhName);
    const rhRank = document.createElement('th'); rhRank.textContent = 'Rank'; rhRank.classList.add('col-rank'); rhRank.setAttribute('data-col','rank'); rh.appendChild(rhRank);
    const rhLvl = document.createElement('th'); rhLvl.textContent = 'Level'; rh.appendChild(rhLvl);
    list.appendChild(rh);

    topN.slice(1).forEach((entry, idx) => {
      const r = document.createElement('tr');
      const cPos = document.createElement('td'); cPos.textContent = (idx + 2).toString(); r.appendChild(cPos);
      const cName = document.createElement('td'); 
      cName.style.fontWeight = '500'; 
      cName.style.color = leaderColors[entry.player] || 'black'; 
      cName.appendChild(createPlayerNameNode(entry.player)); 
      r.appendChild(cName);
      const cRank = document.createElement('td'); cRank.classList.add('col-rank'); cRank.setAttribute('data-col','rank'); cRank.textContent = (typeof entry.rank === 'number') ? `#${entry.rank.toLocaleString()}` : ''; r.appendChild(cRank);
      const cLvl = document.createElement('td'); cLvl.textContent = entry.level; r.appendChild(cLvl);
      list.appendChild(r);
    });

    inner.appendChild(list);
    detailCell.appendChild(inner);
    detailRow.appendChild(detailCell);

    row.addEventListener('click', () => {
      detailRow.style.display = (detailRow.style.display === 'none') ? '' : 'none';
    });

    table.appendChild(row);
    table.appendChild(detailRow);
  });

  const box = document.createElement('div');
  box.classList.add('category-box');
  const heading = document.createElement('h2');
  heading.textContent = 'Skill Leaders';
  heading.style.textAlign = 'center';
  box.appendChild(heading);
  box.appendChild(table);

  document.getElementById('results').appendChild(box);
}

// -------- Daily News (skill/minigame changes) --------
function getSkillLevelChanges(snapshots) {
  if (snapshots.length < 2) return [];
  const prev = snapshots[snapshots.length - 2] || {};
  const curr = snapshots[snapshots.length - 1] || {};
  const prevSkills = (prev && prev.skills) ? prev.skills : {};
  const currSkills = (curr && curr.skills) ? curr.skills : {};

  const changes = [];
  for (const skill in currSkills) {
    const currEntry = currSkills[skill];
    if (!currEntry) continue; // nothing to compare

    // If previous snapshot didn't have this skill (e.g., new skill), treat previous as same as current
    // so we don't fabricate "level-ups" from 0. This prevents crashes and noisy news.
    const prevEntry = prevSkills[skill] || {
      level: (typeof currEntry.level === 'number' ? currEntry.level : 0),
      experience: (typeof currEntry.experience === 'number' ? currEntry.experience : 0)
    };

    const oldLevel = getDisplayedLevel(skill, prevEntry.level ?? 0, prevEntry.experience ?? 0);
    const newLevel = getDisplayedLevel(skill, currEntry.level ?? 0, currEntry.experience ?? 0);

    if (newLevel > oldLevel) {
      changes.push({ skill, oldLevel, newLevel, diff: newLevel - oldLevel });
    }
  }
  return changes;
}

function getMinigameChanges(snapshots) {
  if (snapshots.length < 2) return [];
  const prev = snapshots[snapshots.length - 2].minigames || {};
  const curr = snapshots[snapshots.length - 1].minigames || {};
  const changes = [];
  Object.keys(curr).forEach(key => {
    const oldScore = prev[key]?.score ?? 0;
    const newScore = curr[key]?.score ?? 0;
    if (newScore > oldScore) {
      changes.push({ name: key, oldScore, newScore, diff: newScore - oldScore });
    }
  });
  return changes;
}

function renderDailyNews(playersData) {
  const container = document.getElementById('results');
  const box = document.createElement('div');
  box.classList.add('category-box');
  const h2 = document.createElement('h2');
  h2.textContent = 'Daily News';
  box.appendChild(h2);

  const grid = document.createElement('div');
  grid.classList.add('skills-changes-grid');

  playersData.forEach(player => {
    const hasSkill = player.skillChanges.length > 0;
    const hasMG = player.minigameChanges.length > 0;
    if (!hasSkill && !hasMG) return;

    const card = document.createElement('div');
    card.classList.add('player-changes');

    const h3 = document.createElement('h3');
    h3.appendChild(createPlayerNameNode(player.name));
    card.appendChild(h3);

    const ul = document.createElement('ul');

    player.skillChanges.forEach(change => {
      const li = document.createElement('li');
      const img = document.createElement('img');
      img.src = `./images/${change.skill} icon.png`;
      img.alt = `${change.skill} Icon`;
      img.style.width = '20px';
      img.style.height = '20px';
      img.style.verticalAlign = 'middle';
      img.style.margin = '0 5px';

      const before = document.createTextNode(`${change.oldLevel} `);
      const arrow = document.createElement('span');
      arrow.textContent = '\u27BE'; // heavy teardrop-shanked rightwards arrow
      arrow.setAttribute('aria-hidden', 'true');
      arrow.style.margin = '0 4px';
      const after = document.createTextNode(`${change.newLevel}`);

      li.appendChild(img);
      li.appendChild(before);
      li.appendChild(arrow);
      li.appendChild(after);
      ul.appendChild(li);
    });

    player.minigameChanges.forEach(change => {
      if (change.name !== 'Clue Scrolls (all)') {
        const li = document.createElement('li');
        const img = document.createElement('img');
        img.src = `./images/${change.name} icon.png`;
        img.alt = `${prettyName(change.name)} Icon`;
        img.title = `${prettyName(change.name)}`;
        img.style.width = '20px';
        img.style.height = '20px';
        img.style.verticalAlign = 'middle';
        img.style.marginRight = '6px';

        const beforeScore = document.createTextNode(`${change.oldScore} `);
        const arrow2 = document.createElement('span');
        arrow2.textContent = '\u27BE';
        arrow2.setAttribute('aria-hidden', 'true');
        arrow2.style.margin = '0 4px';
        const afterScore = document.createTextNode(`${change.newScore}`);

        li.appendChild(img);
        li.appendChild(beforeScore);
        li.appendChild(arrow2);
        li.appendChild(afterScore);
        ul.appendChild(li);
      }
    });

    card.appendChild(ul);
    grid.appendChild(card);
  });

  box.appendChild(grid);
  makeCollapsible(box, 'Daily News');
  container.appendChild(box);
}

// Compute a Top-N leaderboard for a given minigame/boss item from playersData
function computeTopNForItem(itemName, playersData, N = 5) {
  const rows = [];
  playersData.forEach(p => {
    const entry = p.latestMinigames?.[itemName];
    const score = entry?.score ?? 0;
    if (score > 0) {
      rows.push({
        player: p.name,
        score,
        rank: (typeof entry?.rank === 'number') ? entry.rank : null
      });
    }
  });
  rows.sort((a, b) => b.score - a.score || (a.rank ?? Infinity) - (b.rank ?? Infinity));
  return rows.slice(0, N);
}

// -------- Item Leaders (Boss/Raid/Clue/Others/Minigames) --------
function displayItemLeaders(title, items, playersData, iconMap = {}) {
  const tbl = document.createElement('table');
  tbl.border = '1';
  tbl.style.width = '100%';

  const hdr = document.createElement('tr');

  const thItem = document.createElement('th');
  thItem.textContent = 'Item';
  hdr.appendChild(thItem);

  const thLeader = document.createElement('th');
  thLeader.textContent = 'Leader';
  hdr.appendChild(thLeader);

  const thRank = document.createElement('th');
  thRank.textContent = 'Rank';
  thRank.classList.add('col-rank');
  thRank.setAttribute('data-col', 'rank');
  hdr.appendChild(thRank);

  const thScore = document.createElement('th');
  thScore.textContent = 'Score';
  hdr.appendChild(thScore);

  tbl.appendChild(hdr);

  items.forEach(item => {
    const topN = computeTopNForItem(item, playersData, 5);
    if (topN.length === 0) return;

    const leader = topN[0];

    // Visible leader row
    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.title = 'Click to see runner-ups';

    const cellItem = document.createElement('td');
    const img = document.createElement('img');
    const rawPath = `./images/${item} icon.png`;
    img.src = iconMap[item] ? iconMap[item] : encodeURI(rawPath);
    img.alt = prettyName(item) + ' icon';
    img.style.width = img.style.height = '24px';
    img.style.marginRight = '6px';
    img.style.verticalAlign = 'middle';
    cellItem.appendChild(img);
    cellItem.appendChild(document.createTextNode(prettyName(item)));
    row.appendChild(cellItem);

    const cellLeader = document.createElement('td');
    cellLeader.style.fontWeight = 'bold';
    cellLeader.style.color = leaderColors[leader.player] || 'black';
    cellLeader.appendChild(createPlayerNameNode(leader.player || ''));
    row.appendChild(cellLeader);

    const cellRank = document.createElement('td');
    cellRank.classList.add('col-rank');
    cellRank.setAttribute('data-col', 'rank');
    cellRank.textContent = (typeof leader.rank === 'number') ? `#${leader.rank.toLocaleString()}` : '';
    row.appendChild(cellRank);

    const cellCount = document.createElement('td');
    cellCount.textContent = leader.score.toLocaleString();
    row.appendChild(cellCount);

    // Hidden runner-ups row (positions 2..5)
    const detailRow = document.createElement('tr');
    const detailCell = document.createElement('td');
    detailCell.colSpan = 4;
    detailRow.style.display = 'none';

    const inner = document.createElement('div');
    inner.style.padding = '8px 12px';
    inner.style.background = 'rgba(0,0,0,0.03)';
    inner.style.borderLeft = '3px solid #ddd';

    const list = document.createElement('table');
    list.style.width = '100%';
    list.style.fontSize = '0.95em';

    // Header for runner-ups table
    const rh = document.createElement('tr');
    const rhPos = document.createElement('th'); rhPos.textContent = '#'; rh.appendChild(rhPos);
    const rhName = document.createElement('th'); rhName.textContent = 'Player'; rh.appendChild(rhName);
    const rhRank = document.createElement('th'); rhRank.textContent = 'Rank'; rhRank.classList.add('col-rank'); rhRank.setAttribute('data-col','rank'); rh.appendChild(rhRank);
    const rhScore = document.createElement('th'); rhScore.textContent = 'Score'; rh.appendChild(rhScore);
    list.appendChild(rh);

    topN.slice(1).forEach((entry, idx) => {
      const r = document.createElement('tr');
      const cPos = document.createElement('td'); cPos.textContent = (idx + 2).toString(); r.appendChild(cPos);
      const cName = document.createElement('td'); 
      cName.style.fontWeight = '500'; 
      cName.style.color = leaderColors[entry.player] || 'black'; 
      cName.appendChild(createPlayerNameNode(entry.player)); 
      r.appendChild(cName);
      const cRank = document.createElement('td'); cRank.classList.add('col-rank'); cRank.setAttribute('data-col','rank'); cRank.textContent = (typeof entry.rank === 'number') ? `#${entry.rank.toLocaleString()}` : ''; r.appendChild(cRank);
      const cScore = document.createElement('td'); cScore.textContent = entry.score.toLocaleString(); r.appendChild(cScore);
      list.appendChild(r);
    });

    inner.appendChild(list);
    detailCell.appendChild(inner);
    detailRow.appendChild(detailCell);

    // Toggle behavior
    row.addEventListener('click', () => {
      detailRow.style.display = (detailRow.style.display === 'none') ? '' : 'none';
    });

    tbl.appendChild(row);
    tbl.appendChild(detailRow);
  });

  const box = document.createElement('div');
  box.classList.add('category-box');
  const h2 = document.createElement('h2');
  h2.textContent = title;
  box.appendChild(h2);
  box.appendChild(tbl);
  makeCollapsible(box, title);

  document.getElementById('results').appendChild(box);
}

// ------------------ Main ------------------
async function main() {
  // Apply saved preference for showing ranks
  applyRankPref();
  injectCollapsibleStyles();
  let PLAYERS;
  try {
    PLAYERS = await loadPlayers();
  } catch (e) {
    console.error(e);
    const fallbackMsg = document.createElement('div');
    fallbackMsg.textContent = 'Failed to load players.json. Ensure your data fetcher generated it.';
    document.getElementById('results').appendChild(fallbackMsg);
    return;
  }

  assignColors(PLAYERS);
  await loadPlayerIconsFromJson();

  // Load each player's JSON in parallel, compute changes and latest snapshot info
  const results = await Promise.allSettled(
    PLAYERS.map(async (player) => {
      const data = await fetchPlayerData(player);
      const lastSnap = data.snapshots[data.snapshots.length - 1];
      return {
        name: data.player_name,
        skillChanges: getSkillLevelChanges(data.snapshots),
        minigameChanges: getMinigameChanges(data.snapshots),
        latestMinigames: lastSnap.minigames,
        latestTimestamp: lastSnap.timestamp
      };
    })
  );

  const playersData = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  // Log rejections once (they are also cached in missingCache so we won't retry)
  results
    .filter(r => r.status === 'rejected')
    .forEach((r, idx) => {
      console.error('Error fetching/parsing player:', PLAYERS[idx], r.reason);
    });

  if (playersData.length === 0) {
    const warn = document.createElement('div');
    warn.className = 'category-box';
    warn.textContent = 'No player data could be loaded. Check that file names in site/data match players.json (spaces often saved as underscores).';
    document.getElementById('results').appendChild(warn);
    return;
  }

  // Compute most recent snapshot timestamp across players and show banner
  const lastIso = playersData
    .map(p => p.latestTimestamp)
    .filter(Boolean)
    .sort()
    .pop();
  renderRefreshPill(lastIso);
  
  // Render bingo homage section
  renderBingoHomageSection();

  // Apply initial bingo state
  const bingoOn = getShowBingoPref();
  document.body.classList.toggle('show-bingo', bingoOn);

  // Render sections
  renderDailyNews(playersData);

  // Leaders by item groups (no XP categories like Gathering/Production)
  displayItemLeaders('Boss Leaders', CUSTOM_CATEGORIES.Bosses.minigames, playersData);
  displayItemLeaders('Raid Leaders', CUSTOM_CATEGORIES.Raids.minigames, playersData);
  displayItemLeaders('Clue Leaders', CUSTOM_CATEGORIES.Clues.minigames, playersData);
  displayItemLeaders('Other Leaders', CUSTOM_CATEGORIES.Others.minigames, playersData);
  displayItemLeaders('Minigame Leaders', CUSTOM_CATEGORIES.Minigames.minigames, playersData);

  // Move Skill Leaders last
  await displayHighestLevels(PLAYERS);
}

main();

