# Differ Puzzle Dataset Extraction

> Complete puzzle dataset extraction from [joe-brothers/differ](https://github.com/joe-brothers/differ) with all original coordinates preserved.

## Overview

This repository extracts and transforms the complete puzzle database from the Differ game's SQL source file. Every puzzle record, coordinate, and difference rectangle is preserved exactly as stored in the original source.

## Source

**SQL File:** `puzzles.sql` (181 puzzle records)  
**URL:** https://raw.githubusercontent.com/joe-brothers/differ/main/packages/server/scripts/seed/puzzles.sql

## Key Principles

✓ **No Invention:** All data comes directly from the GitHub SQL source  
✓ **No Modification:** Coordinates are preserved exactly—no rounding, scaling, or normalization  
✓ **No Deletion:** All 10 difference rectangles per puzzle are retained  
✓ **No Pairing:** Rectangles are never paired or merged without evidence  
✓ **Separation of Concerns:** Source dataset ≠ Playable dataset

## Output Files

### `data/puzzles.json`

Complete puzzle dataset with all source coordinates.

```json
[
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
      ...
    ]
  }
]
```

### `data/puzzle-list.json`

Simple puzzle list for quick reference.

```json
[
  {
    "puzzleNumber": "000096",
    "originalUrl": "https://differ-assets.joe-brothers.com/temp_image/000096.png",
    "differentUrl": "https://differ-assets.joe-brothers.com/temp_image/000096_d.png",
    "differenceCount": 10
  }
]
```

## Puzzle Statistics

- **Total Puzzles:** 181
- **Successfully Parsed:** 181
- **Difference Rectangles:** 10 per puzzle (source)
- **CDN Base:** `https://differ-assets.joe-brothers.com`

## Difference Rectangle Format

Each source difference is stored in the original image coordinate system:

```typescript
interface Difference {
  id: string;           // UUID of the difference
  x: number;            // Top-left X coordinate
  y: number;            // Top-left Y coordinate
  width: number;        // Rectangle width
  height: number;       // Rectangle height
}
```

### Hit Testing

For a point `(px, py)` to hit a difference rectangle:

```typescript
function hitTest(rect: Difference, px: number, py: number): boolean {
  return (
    px >= rect.x &&
    px <= rect.x + rect.width &&
    py >= rect.y &&
    py <= rect.y + rect.height
  );
}
```

### Center Point

The center of a difference rectangle:

```typescript
const centerX = rect.x + rect.width / 2;
const centerY = rect.y + rect.height / 2;
```

## Coordinate System

All coordinates are in the **original image coordinate system** (not screen coordinates). If your game scales or transforms the image:

1. Transform the player's screen click into image coordinates
2. Perform hit testing using the original rectangles
3. Do NOT modify the stored coordinates

```typescript
const imageX = (screenX - renderedImageX) / scaleX;
const imageY = (screenY - renderedImageY) / scaleY;
const hit = hitTest(rectangle, imageX, imageY);
```

## CDN URL Generation

For every puzzle, construct CDN URLs as follows:

```typescript
const originalUrl = `https://differ-assets.joe-brothers.com${path}.${extension}`;
const differentUrl = `https://differ-assets.joe-brothers.com${path}_d.${extension}`;

// Example:
// path = /temp_image/000096
// extension = png
// originalUrl = https://differ-assets.joe-brothers.com/temp_image/000096.png
// differentUrl = https://differ-assets.joe-brothers.com/temp_image/000096_d.png
```

## Important: Source vs. Playable Dataset

If your game requires exactly **5 differences** but the source contains **10 rectangles**, you must:

1. **Keep the source dataset unchanged** (10 rectangles)
2. **Create a separate playable dataset** (5 carefully selected/verified rectangles)
3. **Verify visually** which rectangles truly represent differences in the image pair

**DO NOT:**
- Silently hide 5 rectangles
- Automatically slice `differences.slice(0, 5)`
- Pair rectangles without evidence
- Claim a 10-rectangle puzzle is a 5-difference puzzle

## Running the Extraction

```bash
# Install dependencies
npm install

# Run extraction (requires puzzles.sql in scripts/seed/)
npm run extract

# Output: data/puzzles.json and data/puzzle-list.json
```

## Validation

The extraction script validates:

✓ All URLs end with `.png` or `_d.png`  
✓ All puzzles have at least one difference  
✓ All coordinates are valid numbers  
✓ Exactly 181 puzzles are extracted

## Image Availability

Before using a puzzle in production:

```typescript
const checkImageAvailability = async (puzzle: SourcePuzzle) => {
  const originalResponse = await fetch(puzzle.originalUrl);
  const differentResponse = await fetch(puzzle.differentUrl);
  
  if (originalResponse.ok && differentResponse.ok) {
    // Both images are available
    return true;
  }
  // Remove from playable dataset if either is missing
  return false;
};
```

## Related

- **Source Repository:** [joe-brothers/differ](https://github.com/joe-brothers/differ)
- **Game:** [Differ Web Game (Beta)](https://differ.joe-brothers.com)
- **Asset CDN:** https://differ-assets.joe-brothers.com

## License

Puzzle data extracted from [joe-brothers/differ](https://github.com/joe-brothers/differ).

---

**Extraction Date:** 2026-09-15  
**Source Commit:** b6568598a0ce9bf8be4f12cca409c6a5b629f719
