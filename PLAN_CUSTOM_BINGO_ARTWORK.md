# Plan: Custom Artwork Integration for Raidsward Enclave

## Analysis of Provided Image

### Image Details:
- **Title**: "Enclave of Legends"
- **Subtitle**: "Completion Bonus: 7 points"
- **Background**: Custom OSRS-themed artwork with Fashionstand logo
- **Layout**: 7 distinct boxes arranged in a specific pattern
- **Style**: Medieval/OSRS aesthetic with decorative borders

### Box Layout (from image):
```
Row 1 (Top):
[Any Raids Mega Rare] [Either Dust] [Kit or Item]

Row 2 (Middle):
[Any Raids Pet] [Non Mega TOB Purple] [Non Mega COX Purple]

Row 3 (Bottom):
[2x Non Mega TOA Purple] (spans full width, yellow border)
```

### Visual Elements:
- Custom background with purple/dark theme
- Decorative scroll banner at top
- Character artwork (left and right sides)
- Individual boxes with borders
- Text labels inside boxes
- Color-coded text (purple, yellow, etc.)

---

## Feasibility Assessment

### ✅ HIGHLY FEASIBLE

**Why this works:**

1. **Image as Background**
   - Use the artwork as a background image
   - Overlay transparent clickable divs on top of each box
   - CSS `position: absolute` for precise positioning

2. **Existing Functionality**
   - All current bingo logic remains the same
   - Admin mode works identically
   - Count tracking (0/3) works identically
   - Cloud persistence works identically

3. **Click Detection**
   - Map clickable areas to match the 7 boxes in the image
   - Use CSS to position invisible clickable overlays
   - Visual feedback through opacity/glow effects

4. **Responsive Design**
   - Image scales proportionally
   - Clickable areas scale with the image
   - Works on mobile with proper viewport scaling

---

## Implementation Approach

### Option A: Image with Overlay Hotspots (RECOMMENDED)

**How it works:**
1. Display the full artwork as a background
2. Create 7 transparent clickable `<div>` elements
3. Position them precisely over each box in the image
4. Add visual feedback (glow, border, opacity) on click
5. Keep all existing tile logic

**Pros:**
- ✅ Preserves the beautiful custom artwork
- ✅ Minimal code changes
- ✅ All existing functionality works
- ✅ Easy to maintain
- ✅ Looks exactly like the artwork

**Cons:**
- ⚠️ Requires precise positioning (but manageable)
- ⚠️ Need to handle responsive scaling

---

### Option B: Recreate Boxes with CSS (Alternative)

**How it works:**
1. Use the artwork as a background
2. Recreate the boxes with HTML/CSS elements
3. Style them to match the image boxes
4. More flexible for responsive design

**Pros:**
- ✅ More flexible layout
- ✅ Easier responsive behavior
- ✅ Can add custom animations

**Cons:**
- ❌ Won't look exactly like the artwork
- ❌ More CSS work
- ❌ Loses some of the custom design charm

---

## Recommended Solution: Option A (Image + Overlays)

### Technical Implementation

#### 1. Image Preparation
```
- Save image as: site/images/raidsward-enclave.png
- Recommended size: 1200px width (high quality)
- Format: PNG with transparency (if needed)
```

#### 2. HTML Structure
```html
<div class="village-card village-custom-raidsward">
  <div class="custom-village-container">
    <img src="./images/raidsward-enclave.png" alt="Raidsward Enclave" class="village-bg-image">
    
    <!-- Clickable overlay boxes -->
    <div class="custom-tile-overlay" data-tile-id="v1_t1" data-position="top-left">
      <div class="tile-glow"></div>
      <div class="tile-count-badge">0/3</div>
    </div>
    
    <div class="custom-tile-overlay" data-tile-id="v1_t2" data-position="top-center">
      <div class="tile-glow"></div>
      <div class="tile-count-badge">0/3</div>
    </div>
    
    <!-- ... 5 more overlays for remaining boxes -->
  </div>
</div>
```

#### 3. CSS Positioning
```css
.village-custom-raidsward .custom-village-container {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.village-custom-raidsward .village-bg-image {
  width: 100%;
  height: auto;
  display: block;
}

.custom-tile-overlay {
  position: absolute;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* Position each box (percentages for responsive scaling) */
.custom-tile-overlay[data-position="top-left"] {
  top: 28%;
  left: 5%;
  width: 25%;
  height: 18%;
}

.custom-tile-overlay[data-position="top-center"] {
  top: 28%;
  left: 38%;
  width: 25%;
  height: 18%;
}

.custom-tile-overlay[data-position="top-right"] {
  top: 28%;
  left: 71%;
  width: 25%;
  height: 18%;
}

/* ... more positions for other boxes */

/* Visual feedback on hover (admin mode) */
.custom-tile-overlay.admin-active:hover {
  background: rgba(255, 215, 0, 0.2);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
}

/* Count-based glow effects */
.custom-tile-overlay[data-count="1"] .tile-glow {
  box-shadow: inset 0 0 30px rgba(205, 127, 50, 0.6);
}

.custom-tile-overlay[data-count="2"] .tile-glow {
  box-shadow: inset 0 0 30px rgba(192, 192, 192, 0.6);
}

.custom-tile-overlay[data-count="3"] .tile-glow {
  box-shadow: inset 0 0 40px rgba(255, 215, 0, 0.8);
  animation: goldPulse 2s ease-in-out infinite;
}

/* Count badge (small number in corner) */
.tile-count-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(0, 0, 0, 0.7);
  color: #ffd700;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
  pointer-events: none;
}
```

#### 4. JavaScript Changes
```javascript
function createVillageCard(village) {
  // Check if this is the custom Raidsward Enclave
  if (village.id === 1) {
    return createCustomRaidswardCard(village);
  }
  
  // Regular village card for others
  // ... existing code
}

function createCustomRaidswardCard(village) {
  const card = document.createElement('div');
  card.className = 'village-card village-custom-raidsward';
  
  const container = document.createElement('div');
  container.className = 'custom-village-container';
  
  // Background image
  const bgImage = document.createElement('img');
  bgImage.src = './images/raidsward-enclave.png';
  bgImage.alt = 'Raidsward Enclave';
  bgImage.className = 'village-bg-image';
  container.appendChild(bgImage);
  
  // Create overlay boxes
  const positions = [
    { tile: village.tiles[0], position: 'top-left', top: '28%', left: '5%', width: '25%', height: '18%' },
    { tile: village.tiles[1], position: 'top-center', top: '28%', left: '38%', width: '25%', height: '18%' },
    { tile: village.tiles[2], position: 'top-right', top: '28%', left: '71%', width: '25%', height: '18%' },
    { tile: village.tiles[3], position: 'mid-left', top: 52%', left: '5%', width: '25%', height: '18%' },
    { tile: village.tiles[4], position: 'mid-center', top: '52%', left: '38%', width: '25%', height: '18%' },
    { tile: village.tiles[5], position: 'mid-right', top: '52%', left: '71%', width: '25%', height: '18%' },
    { tile: village.tiles[6], position: 'bottom-full', top: '76%', left: '15%', width: '70%', height: '18%' }
  ];
  
  positions.forEach(pos => {
    const overlay = createCustomTileOverlay(pos.tile, pos);
    container.appendChild(overlay);
  });
  
  card.appendChild(container);
  return card;
}

function createCustomTileOverlay(tile, position) {
  const count = bingoState[currentTeam][tile.id] || 0;
  
  const overlay = document.createElement('div');
  overlay.className = 'custom-tile-overlay' + (adminMode ? ' admin-active' : '');
  overlay.dataset.tileId = tile.id;
  overlay.dataset.position = position.position;
  overlay.dataset.count = count;
  
  // Position styling
  overlay.style.top = position.top;
  overlay.style.left = position.left;
  overlay.style.width = position.width;
  overlay.style.height = position.height;
  
  if (adminMode) {
    overlay.addEventListener('click', () => handleTileClick(tile.id));
  }
  
  // Glow effect
  const glow = document.createElement('div');
  glow.className = 'tile-glow';
  overlay.appendChild(glow);
  
  // Count badge
  const badge = document.createElement('div');
  badge.className = 'tile-count-badge';
  badge.textContent = `${count}/3`;
  overlay.appendChild(badge);
  
  return overlay;
}
```

---

## Exact Box Positions (from image analysis)

Based on the provided image, here are the approximate positions:

```javascript
const BOX_POSITIONS = {
  // Row 1
  'v1_t1': { top: '28%', left: '5%', width: '25%', height: '18%' },   // Any Raids Mega Rare
  'v1_t2': { top: '28%', left: '38%', width: '25%', height: '18%' },  // Either Dust
  'v1_t3': { top: '28%', left: '71%', width: '25%', height: '18%' },  // Kit or Item
  
  // Row 2
  'v1_t4': { top: '52%', left: '5%', width: '25%', height: '18%' },   // Any Raids Pet
  'v1_t5': { top: '52%', left: '38%', width: '25%', height: '18%' },  // Non Mega TOB Purple
  'v1_t6': { top: '52%', left: '71%', width: '25%', height: '18%' },  // Non Mega COX Purple
  
  // Row 3 (wide box)
  'v1_t7': { top: '76%', left: '15%', width: '70%', height: '18%' }   // 2x Non Mega TOA Purple
};
```

*Note: These percentages will need fine-tuning after seeing the actual image dimensions*

---

## Implementation Steps

### Phase 1: Image Preparation (5 min)
1. Copy the artwork to `site/images/raidsward-enclave.png`
2. Verify image quality and dimensions
3. Test image loading in browser

### Phase 2: CSS Styling (20 min)
1. Add `.village-custom-raidsward` styles
2. Add `.custom-tile-overlay` positioning
3. Add hover/glow effects
4. Add count badge styling
5. Test responsive scaling

### Phase 3: JavaScript Updates (25 min)
1. Add `createCustomRaidswardCard()` function
2. Add `createCustomTileOverlay()` function
3. Update `createVillageCard()` to detect village ID 1
4. Update tile click handlers to work with overlays
5. Test admin mode functionality

### Phase 4: Fine-tuning (15 min)
1. Adjust box positions to match image exactly
2. Test on different screen sizes
3. Verify click detection accuracy
4. Test count updates and visual feedback

### Phase 5: Testing (10 min)
1. Test all 7 boxes clickable in admin mode
2. Test count cycling (0→1→2→3→0)
3. Test visual feedback (bronze/silver/gold)
4. Test team switching
5. Test cloud persistence

**Total Time: ~75 minutes**

---

## Advantages of This Approach

✅ **Preserves Artwork**: The beautiful custom design stays intact
✅ **Minimal Changes**: Only affects Village 1 (Raidsward Enclave)
✅ **Same Functionality**: All existing features work identically
✅ **Easy to Revert**: Can switch back to standard tiles anytime
✅ **Scalable**: Can apply same approach to other villages later
✅ **Mobile Friendly**: Responsive scaling works naturally
✅ **Performance**: No performance impact (just one image)

---

## Potential Challenges & Solutions

### Challenge 1: Precise Positioning
**Issue**: Overlay boxes must align perfectly with image boxes
**Solution**: 
- Use percentage-based positioning for responsive scaling
- Add dev mode to show overlay boundaries
- Fine-tune with browser dev tools

### Challenge 2: Responsive Scaling
**Issue**: Boxes must stay aligned on different screen sizes
**Solution**:
- Use `aspect-ratio` CSS to maintain image proportions
- Use percentage-based positioning (not pixels)
- Test on multiple devices

### Challenge 3: Click Detection Accuracy
**Issue**: Users might click between boxes
**Solution**:
- Make overlay areas slightly larger (with padding)
- Add visual feedback on hover
- Use `pointer-events: none` on the background image

### Challenge 4: Count Badge Visibility
**Issue**: Badge might be hard to read on the artwork
**Solution**:
- Use semi-transparent dark background
- Add text shadow for contrast
- Position in corner of each box
- Make font size responsive

---

## Alternative: Hybrid Approach

If precise positioning proves difficult, we can use a **hybrid approach**:

1. Use the artwork as a decorative header
2. Display standard tile boxes below it
3. Keep the visual appeal while maintaining easier functionality

This would look like:
```
[Custom Artwork Image - Decorative]
─────────────────────────────────
[Standard Tile 1] [Standard Tile 2] [Standard Tile 3]
[Standard Tile 4] [Standard Tile 5] [Standard Tile 6]
[Standard Tile 7 - Full Width]
```

---

## Recommendation

### ✅ GO WITH OPTION A (Image + Overlays)

**Reasoning:**
1. The artwork is beautiful and should be showcased
2. The technical implementation is straightforward
3. All existing functionality is preserved
4. It's unique and impressive
5. Can be replicated for other villages if desired

**Estimated Success Rate**: 95%

The only potential issue is getting the positioning pixel-perfect, but with percentage-based positioning and some fine-tuning, this is very achievable.

---

## Next Steps

If you want to proceed:

1. **Confirm the approach** (Option A recommended)
2. **Provide the image** (already provided ✅)
3. **I'll implement it** (~75 minutes)
4. **Fine-tune positioning** together (5-10 minutes)
5. **Test and deploy**

---

## Conclusion

**VERDICT: ✅ HIGHLY FEASIBLE**

This is absolutely doable and will look amazing! The custom artwork will make your Raidsward Enclave village stand out while maintaining all the functionality of the bingo system.

The implementation is straightforward, the technical challenges are manageable, and the result will be a unique, visually impressive bingo board that showcases your custom artwork.

**Ready to implement when you are!** 🎯✨
