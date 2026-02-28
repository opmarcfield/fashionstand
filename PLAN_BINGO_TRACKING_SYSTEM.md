# Plan: Clan Bingo Tracking System

## Overview
Implement a full-featured Bingo tracking system with 4 villages, 2 teams, admin mode, and cloud persistence.

---

## Phase 1: Data Structure

### BINGO_DATA Constant
```javascript
const BINGO_DATA = {
  villages: [
    {
      id: 1,
      name: "Raidsward Enclave",
      tiles: [
        { id: "v1_t1", name: "Any mega rare", maxCount: 3 },
        { id: "v1_t2", name: "Any dust", maxCount: 3 },
        { id: "v1_t3", name: "Any TOB or COX kit", maxCount: 3 },
        { id: "v1_t4", name: "Any Raids pet", maxCount: 3 },
        { id: "v1_t5", name: "Non mega TOB purple", maxCount: 3 },
        { id: "v1_t6", name: "Non mega COX purple", maxCount: 3 },
        { id: "v1_t7", name: "Non mega TOA purple", maxCount: 3 },
        { id: "v1_t8", name: "Non mega TOA purple", maxCount: 3 }
      ]
    },
    {
      id: 2,
      name: "Oathbound Oblivion",
      tiles: [
        { id: "v2_t1", name: "Full moons OR barrows set", maxCount: 3 },
        { id: "v2_t2", name: "DK Lord of the Rings", maxCount: 3 },
        { id: "v2_t3", name: "Crystal armor seed", maxCount: 3 },
        { id: "v2_t4", name: "Crystal armor seed", maxCount: 3 },
        { id: "v2_t5", name: "Crystal armor seed", maxCount: 3 },
        { id: "v2_t6", name: "Delve Unique", maxCount: 3 },
        { id: "v2_t7", name: "Yama unique", maxCount: 3 },
        { id: "v2_t8", name: "Nightmare/Corp/Nex unique", maxCount: 3 },
        { id: "v2_t9", name: "Full Godsword", maxCount: 3 },
        { id: "v2_t10", name: "PVM/Minigame non-raid/wildy pet", maxCount: 3 },
        { id: "v2_t11", name: "Zulrah OR Vorkath unique", maxCount: 3 },
        { id: "v2_t12", name: "Twinflame staff OR dragon hunter wand", maxCount: 3 },
        { id: "v2_t13", name: "Slayer jar", maxCount: 3 },
        { id: "v2_t14", name: "Virtus", maxCount: 3 },
        { id: "v2_t15", name: "Virtus", maxCount: 3 },
        { id: "v2_t16", name: "Virtus", maxCount: 3 },
        { id: "v2_t17", name: "Colosseum unique", maxCount: 3 }
      ]
    },
    {
      id: 3,
      name: "Skullspire Outpost",
      tiles: [
        { id: "v3_t1", name: "Wildy pet", maxCount: 3 },
        { id: "v3_t2", name: "Voidwaker", maxCount: 3 },
        { id: "v3_t3", name: "Wildy Lord of the Ring", maxCount: 3 },
        { id: "v3_t4", name: "Bow OR chainmace OR sceptre", maxCount: 3 },
        { id: "v3_t5", name: "Amulet of Avarice OR ancient crystal", maxCount: 3 },
        { id: "v3_t6", name: "Any complete ward", maxCount: 3 }
      ]
    },
    {
      id: 4,
      name: "Prospector's Rest",
      tiles: [
        { id: "v4_t1", name: "Skilling pet", maxCount: 3 },
        { id: "v4_t2", name: "Crystal tool seed", maxCount: 3 },
        { id: "v4_t3", name: "Tome of fire OR water", maxCount: 3 },
        { id: "v4_t4", name: "1/3k salvage drop", maxCount: 3 },
        { id: "v4_t5", name: "Dragon canon barrel OR angler's paint", maxCount: 3 },
        { id: "v4_t6", name: "Ring of endurance", maxCount: 3 },
        { id: "v4_t7", name: "Holey moley from scratch", maxCount: 3 }
      ]
    }
  ]
};
```

### State Management
```javascript
// Current bingo state
let bingoState = {
  teamA: {}, // { tileId: count }
  teamB: {}
};

// UI state
let currentTeam = 'teamA'; // 'teamA' or 'teamB'
let adminMode = false;
const ADMIN_PASSWORD = 'bingo2026'; // Simple password
```

---

## Phase 2: UI Structure

### Update renderBingoSection()
Replace placeholder with actual bingo board:

```javascript
function renderBingoSection() {
  const bingoSection = document.querySelector('.bingo-section');
  if (!bingoSection) return;
  
  bingoSection.innerHTML = '';
  
  // Header with team toggle and admin button
  const header = createBingoHeader();
  bingoSection.appendChild(header);
  
  // Villages grid
  BINGO_DATA.villages.forEach(village => {
    const villageCard = createVillageCard(village);
    bingoSection.appendChild(villageCard);
  });
}
```

### HTML Structure
```html
<div class="bingo-section">
  <div class="bingo-header">
    <div class="team-toggle">
      <button class="team-btn active" data-team="teamA">Team A</button>
      <button class="team-btn" data-team="teamB">Team B</button>
    </div>
    <button class="admin-btn">🔒 Admin Mode</button>
  </div>
  
  <div class="village-card">
    <h3 class="village-name">Village Name</h3>
    <div class="tiles-grid">
      <div class="bingo-tile" data-count="0">
        <div class="tile-name">Tile Name</div>
        <div class="tile-count">0/3</div>
      </div>
      <!-- More tiles... -->
    </div>
  </div>
  <!-- More villages... -->
</div>
```

---

## Phase 3: Styling

### CSS Classes

```css
/* Bingo Header */
.bingo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.team-toggle {
  display: flex;
  gap: 8px;
}

.team-btn {
  padding: 10px 20px;
  background: rgba(141, 110, 99, 0.6);
  border: 2px solid rgba(161, 136, 127, 0.5);
  border-radius: 8px;
  color: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.team-btn.active {
  background: linear-gradient(135deg, #26a69a 0%, #00897b 100%);
  border-color: rgba(38, 166, 154, 0.8);
  box-shadow: 0 4px 12px rgba(38, 166, 154, 0.4);
}

.admin-btn {
  padding: 10px 20px;
  background: rgba(141, 110, 99, 0.6);
  border: 2px solid rgba(161, 136, 127, 0.5);
  border-radius: 8px;
  color: #f5f5f5;
  cursor: pointer;
}

.admin-btn.active {
  background: linear-gradient(135deg, #d4af37 0%, #c5a028 100%);
  border-color: rgba(212, 175, 55, 0.8);
}

/* Village Cards */
.village-card {
  background: rgba(109, 76, 65, 0.8);
  border: 2px solid rgba(141, 110, 99, 0.6);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.village-name {
  font-size: 1.4em;
  margin-bottom: 16px;
  color: #ffd700;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

/* Tiles Grid */
.tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

/* Bingo Tile States */
.bingo-tile {
  background: rgba(80, 60, 55, 0.8);
  border: 2px solid rgba(100, 80, 75, 0.6);
  border-radius: 8px;
  padding: 12px;
  cursor: default;
  transition: all 0.3s ease;
  position: relative;
}

.bingo-tile.admin-active {
  cursor: pointer;
}

.bingo-tile.admin-active:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Count-based styling */
.bingo-tile[data-count="0"] {
  opacity: 0.5;
  border-color: rgba(100, 80, 75, 0.4);
}

.bingo-tile[data-count="1"] {
  background: linear-gradient(135deg, rgba(205, 127, 50, 0.3), rgba(139, 69, 19, 0.3));
  border-color: rgba(205, 127, 50, 0.8);
  box-shadow: 0 0 12px rgba(205, 127, 50, 0.3);
}

.bingo-tile[data-count="2"] {
  background: linear-gradient(135deg, rgba(192, 192, 192, 0.3), rgba(169, 169, 169, 0.3));
  border-color: rgba(192, 192, 192, 0.8);
  box-shadow: 0 0 12px rgba(192, 192, 192, 0.3);
}

.bingo-tile[data-count="3"] {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(218, 165, 32, 0.3));
  border-color: rgba(255, 215, 0, 0.8);
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.4);
  animation: goldGlow 2s ease-in-out infinite;
}

@keyframes goldGlow {
  0%, 100% { box-shadow: 0 0 16px rgba(255, 215, 0, 0.4); }
  50% { box-shadow: 0 0 24px rgba(255, 215, 0, 0.6); }
}

.tile-name {
  font-size: 0.95em;
  margin-bottom: 8px;
  color: #f5f5f5;
}

.tile-count {
  font-size: 0.85em;
  color: #ffd700;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .tiles-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px;
  }
  
  .bingo-header {
    flex-direction: column;
    gap: 12px;
  }
}
```

---

## Phase 4: Functionality

### Admin Mode
```javascript
function toggleAdminMode() {
  if (!adminMode) {
    const password = prompt('Enter admin password:');
    if (password === ADMIN_PASSWORD) {
      adminMode = true;
      updateAdminUI();
    } else {
      alert('Incorrect password!');
    }
  } else {
    adminMode = false;
    updateAdminUI();
  }
}

function updateAdminUI() {
  const adminBtn = document.querySelector('.admin-btn');
  const tiles = document.querySelectorAll('.bingo-tile');
  
  if (adminMode) {
    adminBtn.classList.add('active');
    adminBtn.innerHTML = '🔓 Admin Mode';
    tiles.forEach(tile => tile.classList.add('admin-active'));
  } else {
    adminBtn.classList.remove('active');
    adminBtn.innerHTML = '🔒 Admin Mode';
    tiles.forEach(tile => tile.classList.remove('admin-active'));
  }
}
```

### Tile Click Handler
```javascript
function handleTileClick(tileId) {
  if (!adminMode) return;
  
  const team = currentTeam;
  const currentCount = bingoState[team][tileId] || 0;
  const newCount = (currentCount + 1) % 4; // Cycle 0-1-2-3-0
  
  bingoState[team][tileId] = newCount;
  
  // Update UI
  updateTileDisplay(tileId);
  
  // Save to cloud
  saveBingoState();
}
```

---

## Phase 5: Cloud Persistence

### Option 1: JSONBin.io (Recommended - Free, Simple)

```javascript
const JSONBIN_API_KEY = 'YOUR_API_KEY';
const JSONBIN_BIN_ID = 'YOUR_BIN_ID';

async function saveBingoState() {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(bingoState)
    });
    
    if (!response.ok) {
      console.error('Failed to save bingo state');
    }
  } catch (err) {
    console.error('Error saving bingo state:', err);
  }
}

async function loadBingoState() {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': JSONBIN_API_KEY
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      bingoState = data.record || { teamA: {}, teamB: {} };
      updateAllTiles();
    }
  } catch (err) {
    console.error('Error loading bingo state:', err);
  }
}
```

### Option 2: Supabase (More Features)

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

async function saveBingoState() {
  const { error } = await supabase
    .from('bingo_state')
    .upsert({ id: 1, state: bingoState, updated_at: new Date() });
    
  if (error) console.error('Error saving:', error);
}

async function loadBingoState() {
  const { data, error } = await supabase
    .from('bingo_state')
    .select('state')
    .eq('id', 1)
    .single();
    
  if (data) {
    bingoState = data.state;
    updateAllTiles();
  }
}
```

---

## Phase 6: Integration

### Update main() function
```javascript
async function main() {
  // ... existing code ...
  
  renderRefreshPill(lastIso);
  renderBingoSection();
  
  // Load bingo state from cloud
  await loadBingoState();
  
  // Apply initial bingo visibility
  const bingoOn = getShowBingoPref();
  document.body.classList.toggle('show-bingo', bingoOn);
  
  // ... rest of code ...
}
```

---

## Implementation Order

1. ✅ **Phase 1:** Add BINGO_DATA constant (10 min)
2. ✅ **Phase 2:** Create UI rendering functions (30 min)
3. ✅ **Phase 3:** Add CSS styling (25 min)
4. ✅ **Phase 4:** Implement admin mode & tile clicks (20 min)
5. ✅ **Phase 5:** Add cloud persistence (JSONBin.io) (15 min)
6. ✅ **Phase 6:** Integration & testing (20 min)

**Total: ~2 hours**

---

## Setup Instructions for JSONBin.io

1. Go to https://jsonbin.io/
2. Sign up for free account
3. Create a new bin with initial data: `{"teamA": {}, "teamB": {}}`
4. Copy the Bin ID and API Key
5. Add to config.js or script.js

---

## Testing Checklist

- [ ] Villages display correctly
- [ ] Tiles show proper names and counts
- [ ] Team toggle switches between Team A and Team B
- [ ] Admin mode requires password
- [ ] Clicking tiles in admin mode increments count (0→1→2→3→0)
- [ ] Tiles change color based on count (dim→bronze→silver→gold)
- [ ] State persists after page refresh
- [ ] State syncs across different browsers/devices
- [ ] Mobile responsive layout works
- [ ] No console errors

---

## Future Enhancements

- Add team names (editable)
- Add completion percentage per village
- Add completion date/time for tiles
- Add undo button in admin mode
- Add export/import functionality
- Add notification when tile is completed
- Add leaderboard showing which team is ahead

---

## Recommendation

**Use JSONBin.io** for simplicity:
- ✅ Free tier: 100,000 requests/month
- ✅ No database setup needed
- ✅ Simple REST API
- ✅ No dependencies required
- ✅ Works immediately

This is perfect for a small clan bingo tracker!
