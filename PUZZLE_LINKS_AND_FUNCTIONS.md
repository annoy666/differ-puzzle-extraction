# DIFFER PUZZLE DATASET - COMPLETE EXTRACTION

**🔗 Repository:** https://github.com/annoy666/differ-puzzle-extraction

**📥 Source:** https://raw.githubusercontent.com/joe-brothers/differ/main/packages/server/scripts/seed/puzzles.sql

---

## 🚀 QUICK START

### Download & Extract All 181 Puzzles

```bash
cd differ-puzzle-extraction
python3 -m pip install -r requirements.txt
python3 scripts/download-and-parse-puzzles.py
```

Output:
- `data/puzzles.json` - Complete dataset (all 181 puzzles + 1,810 coordinates)
- `data/puzzle-list.json` - Simple reference list

---

## 📊 DATASET ACCESS

### Raw JSON Files (Direct Links)

```
https://raw.githubusercontent.com/annoy666/differ-puzzle-extraction/main/data/puzzles.json
https://raw.githubusercontent.com/annoy666/differ-puzzle-extraction/main/data/puzzle-list.json
```

### Fetch All Puzzles

```javascript
const DATASET_URL = 'https://raw.githubusercontent.com/annoy666/differ-puzzle-extraction/main/data/puzzles.json';

const puzzles = await fetch(DATASET_URL).then(r => r.json());
console.log(`Total puzzles: ${puzzles.length}`); // 181
```

---

## 🎯 ALL PUZZLE LINKS (181 Total)

Format:
```
Puzzle Number: XXXXXX
📷 Original: https://differ-assets.joe-brothers.com/temp_image/XXXXXX.png
🔍 Different: https://differ-assets.joe-brothers.com/temp_image/XXXXXX_d.png
```

### Puzzle Numbers: 000096 - 000278

**Access any puzzle:**

```javascript
// Get puzzle by number
const puzzleNumber = '000096';
const originalUrl = `https://differ-assets.joe-brothers.com/temp_image/${puzzleNumber}.png`;
const differentUrl = `https://differ-assets.joe-brothers.com/temp_image/${puzzleNumber}_d.png`;
```

---

## ⚡ HIT TEST FUNCTION

### Check if player click hits a difference rectangle

```typescript
/**
 * Detect if a point intersects with a difference rectangle
 * @param rect - Rectangle from sourceDifferences
 * @param clickX - Player click X coordinate (in image space)
 * @param clickY - Player click Y coordinate (in image space)
 * @returns true if click hits the rectangle
 */
function hitTestDifference(
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  clickX: number,
  clickY: number
): boolean {
  return (
    clickX >= rect.x &&
    clickX <= rect.x + rect.width &&
    clickY >= rect.y &&
    clickY <= rect.y + rect.height
  );
}

// Usage:
const puzzle = puzzles[0];
const firstDifference = puzzle.sourceDifferences[0];
// {x: 0, y: 0, width: 36, height: 60}

const isHit = hitTestDifference(firstDifference, 18, 30); // true
```

---

## 🎮 COMPLETE GAME EXAMPLE

```typescript
const DATASET_URL = 'https://raw.githubusercontent.com/annoy666/differ-puzzle-extraction/main/data/puzzles.json';

interface Puzzle {
  id: string;
  puzzleNumber: string;
  originalUrl: string;
  differentUrl: string;
  sourceDifferences: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

// Load all puzzles
const allPuzzles: Puzzle[] = await fetch(DATASET_URL).then(r => r.json());
let currentPuzzle = allPuzzles[0];
let foundCount = 0;
const MAX_DIFFERENCES = 10;

// Display images
const originalImg = document.querySelector('#original') as HTMLImageElement;
const differentImg = document.querySelector('#different') as HTMLImageElement;

originalImg.src = currentPuzzle.originalUrl;
differentImg.src = currentPuzzle.differentUrl;

// Handle clicks
function handleImageClick(event: MouseEvent) {
  const canvas = event.target as HTMLImageElement;
  const rect = canvas.getBoundingClientRect();
  
  // Get screen coordinates
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  
  // Transform to image coordinates (if scaled)
  const imageX = (screenX / rect.width) * canvas.naturalWidth;
  const imageY = (screenY / rect.height) * canvas.naturalHeight;
  
  // Check all differences
  for (const diff of currentPuzzle.sourceDifferences) {
    if (
      imageX >= diff.x &&
      imageX <= diff.x + diff.width &&
      imageY >= diff.y &&
      imageY <= diff.y + diff.height
    ) {
      console.log(`✓ Found difference! (${foundCount + 1}/${MAX_DIFFERENCES})`);
      foundCount++;
      
      if (foundCount === MAX_DIFFERENCES) {
        console.log('🎉 Level Complete!');
        // Load next puzzle
        currentPuzzle = allPuzzles[Math.floor(Math.random() * allPuzzles.length)];
        foundCount = 0;
      }
      return;
    }
  }
  
  console.log('✗ Miss!');
}

originalImg.addEventListener('click', handleImageClick);
differentImg.addEventListener('click', handleImageClick);
```

---

## 📐 COORDINATE UTILITIES

### Get Rectangle Center

```typescript
function getRectangleCenter(
  rect: { x: number; y: number; width: number; height: number }
): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

const center = getRectangleCenter(puzzle.sourceDifferences[0]);
// {x: 18, y: 30}
```

### Transform Screen to Image Coordinates

```typescript
function screenToImageCoordinates(
  screenX: number,
  screenY: number,
  renderedImageX: number,
  renderedImageY: number,
  scaleX: number,
  scaleY: number
): { imageX: number; imageY: number } {
  return {
    imageX: (screenX - renderedImageX) / scaleX,
    imageY: (screenY - renderedImageY) / scaleY
  };
}

// If image is displayed at 2x scale:
const imageCoords = screenToImageCoordinates(
  event.clientX,
  event.clientY,
  imageElement.offsetLeft,
  imageElement.offsetTop,
  2,  // scaleX
  2   // scaleY
);
```

### Validate Player Click

```typescript
function validatePlayerClick(
  puzzle: Puzzle,
  clickX: number,
  clickY: number
): { found: boolean; differenceId?: string; differenceIndex?: number } {
  for (let i = 0; i < puzzle.sourceDifferences.length; i++) {
    const diff = puzzle.sourceDifferences[i];
    if (
      clickX >= diff.x &&
      clickX <= diff.x + diff.width &&
      clickY >= diff.y &&
      clickY <= diff.y + diff.height
    ) {
      return {
        found: true,
        differenceId: diff.id,
        differenceIndex: i
      };
    }
  }
  return { found: false };
}

const result = validatePlayerClick(puzzle, 100, 150);
if (result.found) {
  console.log(`✓ Hit difference #${result.differenceIndex + 1}`);
} else {
  console.log('✗ Miss');
}
```

---

## 📦 DATA STRUCTURE

### Single Puzzle Record

```json
{
  "id": "019c6733-4d41-76f2-8500-7175a8a3b63d",
  "puzzleNumber": "000096",
  "path": "/temp_image/000096",
  "extension": "png",
  "originalUrl": "https://differ-assets.joe-brothers.com/temp_image/000096.png",
  "differentUrl": "https://differ-assets.joe-brothers.com/temp_image/000096_d.png",
  "sourceDifferenceCount": 10,
  "sourceDifferences": [
    {
      "id": "019c6733-4d41-76f2-8500-718501b766e7",
      "x": 0,
      "y": 0,
      "width": 36,
      "height": 60
    },
    {
      "id": "019c6733-4d41-76f2-8500-71f09d1a4c8b",
      "x": 0,
      "y": 78,
      "width": 36,
      "height": 75
    },
    ...
  ]
}
```

### Puzzle List Record

```json
{
  "puzzleNumber": "000096",
  "originalUrl": "https://differ-assets.joe-brothers.com/temp_image/000096.png",
  "differentUrl": "https://differ-assets.joe-brothers.com/temp_image/000096_d.png",
  "differenceCount": 10
}
```

---

## 📊 STATISTICS

- **Total Puzzles:** 181
- **Puzzles Range:** 000096 - 000278
- **Difference Rectangles per Puzzle:** 10
- **Total Coordinates:** 1,810
- **Image Format:** PNG
- **CDN Base:** https://differ-assets.joe-brothers.com
- **Dataset Size:** ~2.5 MB (JSON)

---

## 🔍 FETCH BY PUZZLE NUMBER

```javascript
const DATASET_URL = 'https://raw.githubusercontent.com/annoy666/differ-puzzle-extraction/main/data/puzzles.json';

async function getPuzzleByNumber(puzzleNumber) {
  const puzzles = await fetch(DATASET_URL).then(r => r.json());
  return puzzles.find(p => p.puzzleNumber === puzzleNumber);
}

const puzzle = await getPuzzleByNumber('000096');
console.log(puzzle.originalUrl);
// https://differ-assets.joe-brothers.com/temp_image/000096.png
```

---

## ✅ VALIDATION

Every puzzle is validated for:

✓ Original URL ends with `.png`  
✓ Different URL ends with `_d.png`  
✓ Contains 10 difference rectangles  
�� All coordinates are valid numbers  
✓ CDN images are accessible

---

## 📝 ORIGINAL SOURCE

**Repository:** https://github.com/joe-brothers/differ  
**File:** `packages/server/scripts/seed/puzzles.sql`  
**Commit:** b6568598a0ce9bf8be4f12cca409c6a5b629f719  
**Game:** [Differ - Spot the Difference Game](https://differ.joe-brothers.com)

---

**Last Updated:** 2026-09-15  
**Extraction Tool:** Python 3.8+  
**Data Format:** JSON (valid & formatted)
