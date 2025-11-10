// --- Dynamic player loading (no hardcoded names) ---
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
const COLOR_PALETTE = [
  'purple', 'black', 'white', 'blue', 'green', 'crimson', 'goldenrod',
  'teal', 'orangered', 'slateblue', 'darkmagenta', 'darkslategray'
];
function assignColors(players) {
  players.forEach((p, i) => {
    leaderColors[p] = COLOR_PALETTE[i % COLOR_PALETTE.length];
  });
}

// Pretty display names for certain minigame keys
const DISPLAY_NAME = {
  "PVPARENA": "PvP Arena - Rank"
};
function prettyName(name) {
  return DISPLAY_NAME[name] || name;
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

  const wrap = document.createElement('div');
  wrap.className = 'refresh-pill';

  // last refresh (relative only)
  let lastStr = 'unknown';
  if (lastIso) {
    const lastDate = new Date(lastIso);
    lastStr = timeAgo(lastDate);
  }

  // next refresh (relative only)
  const next = nextHelsinkiSix();
  const untilStr = timeUntil(next);

  // Build content using textContent to avoid encoding issues
  const lastSpan = document.createElement('span');
  lastSpan.className = 'refresh-piece';

  const emoji = document.createElement('span');
  emoji.className = 'refresh-emoji';
  emoji.textContent = '\u23F0'; // Alarm clock

  const lastLabel = document.createElement('strong');
  lastLabel.textContent = 'Last:';

  lastSpan.appendChild(emoji);
  lastSpan.appendChild(document.createTextNode(' '));
  lastSpan.appendChild(lastLabel);
  lastSpan.appendChild(document.createTextNode(' ' + lastStr));

  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.setAttribute('aria-hidden', 'true');
  dot.textContent = '\u2022'; // bullet separator

  const nextSpan = document.createElement('span');
  nextSpan.className = 'refresh-piece';
  const nextLabel = document.createElement('strong');
  nextLabel.textContent = 'Next:';
  nextSpan.appendChild(nextLabel);
  nextSpan.appendChild(document.createTextNode(' in ' + untilStr));

  // Clear and append
  wrap.innerHTML = '';
  wrap.appendChild(lastSpan);
  wrap.appendChild(dot);
  wrap.appendChild(nextSpan);

  // Insert just below the intro/banner (if present), else at top
  const intro = document.querySelector('.intro-box');
  if (intro && intro.parentNode) {
    intro.parentNode.insertBefore(wrap, intro.nextSibling);
  } else {
    container.prepend(wrap);
  }
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

// --- Category definitions kept for tables that use MINIGAMES only ---
const CUSTOM_CATEGORIES = {
  Bosses: {
    skills: [],
    minigames: [
      'Abyssal Sire', 'Alchemical Hydra', 'Amoxliatl', 'Araxxor', 'Artio',
      'Barrows', 'Bryophyta', 'Callisto', 'Calvarion', 'Cerberus',
      'Chaos Elemental', 'Chaos Fanatic', 'Commander Zilyana', 'Corporeal Beast',
      'Crazy Archaeologist', 'Dagannoth Prime', 'Dagannoth Rex', 'Dagannoth Supreme',
      'Deranged Archaeologist', 'Doom of Mokhaiotl', 'Duke Sucellus', 'General Graardor', 'Giant Mole',
      'Grotesque Guardians', 'Hespori', 'Kalphite Queen', 'King Black Dragon',
      'Kraken', "Kree'Arra", "K'ril Tsutsaroth", 'Lunar Chests', 'Mimic',
      'Nex', 'Nightmare', "Phosani's Nightmare", 'Obor', 'Phantom Muspah',
      'Sarachnis', 'Scorpia', 'Scurrius', 'Skotizo', 'Sol Heredit',
      'Spindel', 'The Gauntlet', 'The Corrupted Gauntlet', 'The Hueycoatl',
      'The Leviathan', 'The Royal Titans', 'The Whisperer', 'Thermonuclear Smoke Devil',
      'TzKal-Zuk', 'TzTok-Jad', 'Vardorvis', "Venenatis", "Vet'ion",
      'Vorkath', 'Yama', 'Zulrah'
    ]
  },
  Raids: {
    skills: [],
    minigames: [
      'Tombs of Amascut', 'Tombs of Amascut - Expert Mode',
      'Chambers of Xeric', 'Chambers of Xeric: Challenge Mode',
      'Theatre of Blood', 'Theatre of Blood: Hard Mode'
    ]
  },
  Clues: {
    skills: [],
    minigames: [
      'Clue Scrolls (all)', 'Clue Scrolls (beginner)', 'Clue Scrolls (easy)',
      'Clue Scrolls (medium)', 'Clue Scrolls (hard)', 'Clue Scrolls (elite)',
      'Clue Scrolls (master)'
    ]
  },
  Others: {
    skills: [],
    minigames: [
      'Collections Logged', 'Colosseum Glory', 'LMS - Rank', 'PVPARENA', 'Soul Wars Zeal'
    ]
  },
  Minigames: {
    skills: [],
    minigames: ['Tempoross', 'Wintertodt', 'Rifts closed', 'Zalcano']
  }
};

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
  const candidates = filenameCandidates(playerName);
  let lastStatus = null;

  for (const base of candidates) {
    const url = `./data/${encodeURIComponent(base)}.json`;
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        return await resp.json();
      } else {
        lastStatus = resp.status;
      }
    } catch (e) {
      // ignore and try next candidate
    }
  }

  throw new Error(`Failed to load JSON for "${playerName}". Tried: ${candidates.join(', ')}${lastStatus ? ` (last status ${lastStatus})` : ''}`);
}

// Build a { skill: { player, level } } map for top virtual levels
async function getHighestLevels(players) {
  const results = await Promise.allSettled(players.map(fetchPlayerData));
  const ok = [];
  const okNames = [];
  results.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      ok.push(res.value);
      okNames.push(players[idx]);
    } else {
      console.warn('Skipping player (failed to load):', players[idx], res.reason);
    }
  });
  if (ok.length === 0) {
    throw new Error('No player JSONs could be loaded. Check file names in site/data and players.json.');
  }
  const latestSnapshots = ok.map(p => p.snapshots[p.snapshots.length - 1]);
  const skills = Object.keys(latestSnapshots[0].skills);
  const highest = {};

  skills.forEach(skill => {
    if (skill === 'Overall') {
      // Choose Overall leader by highest total experience (not virtual level).
      // Ties on XP are broken by higher level (should be same, but just in case).
      let best = { player: '', level: -1, xp: -1 };
      latestSnapshots.forEach((snap, idx) => {
        const entry = snap.skills['Overall'];
        const xp = entry.experience ?? 0;
        const lvl = entry.level ?? 0;
        if (xp > best.xp || (xp === best.xp && lvl > best.level)) {
          best = { player: okNames[idx], level: lvl, xp };
        }
      });
      highest[skill] = { player: best.player, level: best.level };
    } else {
      // Other skills: pick leader by virtual level derived from XP
      let best = { player: '', level: -1 };
      latestSnapshots.forEach((snap, idx) => {
        const entry = snap.skills[skill];
        const vLvl = getDisplayedLevel(skill, entry.level, entry.experience);
        if (vLvl > best.level) {
          best = { player: okNames[idx], level: vLvl };
        }
      });
      highest[skill] = best;
    }
  });

  return highest;
}

async function displayHighestLevels(players) {
  const highestLevels = await getHighestLevels(players);

  const skillIcons = {
    'Overall': './images/Overall icon.png',
    'Attack': './images/Attack icon.png',
    'Defence': './images/Defence icon.png',
    'Strength': './images/Strength icon.png',
    'Hitpoints': './images/Hitpoints icon.png',
    'Ranged': './images/Ranged icon.png',
    'Prayer': './images/Prayer icon.png',
    'Magic': './images/Magic icon.png',
    'Cooking': './images/Cooking icon.png',
    'Woodcutting': './images/Woodcutting icon.png',
    'Fletching': './images/Fletching icon.png',
    'Fishing': './images/Fishing icon.png',
    'Firemaking': './images/Firemaking icon.png',
    'Crafting': './images/Crafting icon.png',
    'Smithing': './images/Smithing icon.png',
    'Mining': './images/Mining icon.png',
    'Herblore': './images/Herblore icon.png',
    'Agility': './images/Agility icon.png',
    'Thieving': './images/Thieving icon.png',
    'Slayer': './images/Slayer icon.png',
    'Farming': './images/Farming icon.png',
    'Runecraft': './images/Runecraft icon.png',
    'Hunter': './images/Hunter icon.png',
    'Construction': './images/Construction icon.png'
  };

  const table = document.createElement('table');
  table.border = '1';
  table.style.width = '100%';

  const headerRow = document.createElement('tr');
  ['Skill', 'Leader', 'Level'].forEach(txt => {
    const th = document.createElement('th');
    th.textContent = txt;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  Object.entries(highestLevels).forEach(([skill, data]) => {
    const row = document.createElement('tr');

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
    playerCell.textContent = data.player;
    playerCell.style.color = leaderColors[data.player] || 'black';
    playerCell.style.fontWeight = 'bold';
    row.appendChild(playerCell);

    const levelCell = document.createElement('td');
    levelCell.textContent = data.level;
    row.appendChild(levelCell);

    table.appendChild(row);
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
  const prev = snapshots[snapshots.length - 2];
  const curr = snapshots[snapshots.length - 1];
  const changes = [];
  for (const skill in curr.skills) {
    const prevEntry = prev.skills[skill];
    const currEntry = curr.skills[skill];
    const oldLevel = getDisplayedLevel(skill, prevEntry.level, prevEntry.experience);
    const newLevel = getDisplayedLevel(skill, currEntry.level, currEntry.experience);
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
    h3.textContent = player.name;
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
  container.appendChild(box);
}

// -------- Item Leaders (Boss/Raid/Clue/Others/Minigames) --------
function displayItemLeaders(title, items, playersData, iconMap = {}) {
  const tbl = document.createElement('table');
  tbl.border = '1';
  tbl.style.width = '100%';

  const hdr = document.createElement('tr');
  ['Item', 'Leader', 'Score'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    hdr.appendChild(th);
  });
  tbl.appendChild(hdr);

  items.forEach(item => {
    let topCount = -1, topPlayer = null;
    playersData.forEach(p => {
      const count = p.latestMinigames[item]?.score ?? 0;
      if (count > topCount) {
        topCount = count;
        topPlayer = p.name;
      }
    });
    if (topCount <= 0) return;

    const row = document.createElement('tr');
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
    cellLeader.textContent = topPlayer || '–';
    cellLeader.style.fontWeight = 'bold';
    cellLeader.style.color = leaderColors[topPlayer] || 'black';
    row.appendChild(cellLeader);

    const cellCount = document.createElement('td');
    cellCount.textContent = topCount.toLocaleString();
    row.appendChild(cellCount);

    tbl.appendChild(row);
  });

  const box = document.createElement('div');
  box.classList.add('category-box');
  const h2 = document.createElement('h2');
  h2.textContent = title;
  box.appendChild(h2);
  box.appendChild(tbl);

  document.getElementById('results').appendChild(box);
}

// ------------------ Main ------------------
async function main() {
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

  // Load each player's JSON, compute changes and latest snapshot info
  const playersData = [];
  for (const player of PLAYERS) {
    try {
      const data = await fetchPlayerData(player);
      const lastSnap = data.snapshots[data.snapshots.length - 1];
      playersData.push({
        name: data.player_name,
        skillChanges: getSkillLevelChanges(data.snapshots),
        minigameChanges: getMinigameChanges(data.snapshots),
        latestMinigames: lastSnap.minigames,
        latestTimestamp: lastSnap.timestamp
      });
    } catch (err) {
      console.error('Error fetching/parsing player:', player, err);
    }
  }

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

  // Render sections
  renderDailyNews(playersData);
  await displayHighestLevels(PLAYERS);

  // Leaders by item groups (no XP categories like Gathering/Production)
  displayItemLeaders('Boss Leaders', CUSTOM_CATEGORIES.Bosses.minigames, playersData);
  displayItemLeaders('Raid Leaders', CUSTOM_CATEGORIES.Raids.minigames, playersData);
  displayItemLeaders('Clue Leaders', CUSTOM_CATEGORIES.Clues.minigames, playersData);
  displayItemLeaders('Other Leaders', CUSTOM_CATEGORIES.Others.minigames, playersData);
  displayItemLeaders('Minigame Leaders', CUSTOM_CATEGORIES.Minigames.minigames, playersData);
}

main();
