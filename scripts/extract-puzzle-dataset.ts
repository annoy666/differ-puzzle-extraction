#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

/**
 * PUZZLE DATABASE EXTRACTION SCRIPT
 * 
 * Extracts the complete puzzle dataset from puzzles.sql
 * Preserves ALL original coordinates exactly as stored.
 * Source: https://raw.githubusercontent.com/joe-brothers/differ/main/packages/server/scripts/seed/puzzles.sql
 */

interface Difference {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SourcePuzzle {
  id: string;
  puzzleNumber: string;
  path: string;
  extension: string;
  originalUrl: string;
  differentUrl: string;
  sourceDifferenceCount: number;
  sourceDifferences: Difference[];
}

interface PlayablePuzzleListItem {
  puzzleNumber: string;
  originalUrl: string;
  differentUrl: string;
  differenceCount: number;
}

/**
 * Parse a single SQL INSERT statement
 */
function parseSqlInsert(line: string): SourcePuzzle | null {
  // Match: INSERT INTO puzzles (id, differences, path, extension) VALUES ('...', '[...]', '...', '...')
  const match = line.match(
    /INSERT INTO puzzles \(id, differences, path, extension\) VALUES \('([^']+)',\s*'(\[.*?\])',\s*'([^']+)',\s*'([^']+)'\)/
  );

  if (!match) {
    return null;
  }

  const [, id, differencesJson, puzzlePath, extension] = match;

  // Parse the differences JSON
  let differences: any[] = [];
  try {
    differences = JSON.parse(differencesJson);
  } catch (e) {
    console.error(`Failed to parse differences for puzzle ${id}:`, e);
    return null;
  }

  // Extract puzzle number from path (e.g., /temp_image/000096 → 000096)
  const puzzleNumber = puzzlePath.split('/').pop() || '';

  // Transform differences: {id, sp: {x, y}, w, h} → {id, x, y, width, height}
  const sourceDifferences: Difference[] = differences.map((diff) => ({
    id: diff.id,
    x: diff.sp.x,
    y: diff.sp.y,
    width: diff.w,
    height: diff.h,
  }));

  const originalUrl = `https://differ-assets.joe-brothers.com${puzzlePath}.${extension}`;
  const differentUrl = `https://differ-assets.joe-brothers.com${puzzlePath}_d.${extension}`;

  return {
    id,
    puzzleNumber,
    path: puzzlePath,
    extension,
    originalUrl,
    differentUrl,
    sourceDifferenceCount: sourceDifferences.length,
    sourceDifferences,
  };
}

/**
 * Extract all puzzles from SQL file
 */
async function extractPuzzles(sqlFilePath: string): Promise<SourcePuzzle[]> {
  const content = fs.readFileSync(sqlFilePath, 'utf-8');
  const lines = content.split('\n');

  const puzzles: SourcePuzzle[] = [];
  let currentLine = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Accumulate lines until we find a complete INSERT statement
    currentLine += line;

    // Check if this line ends with a semicolon (end of statement)
    if (line.includes(');')) {
      const puzzle = parseSqlInsert(currentLine);
      if (puzzle) {
        puzzles.push(puzzle);
      }
      currentLine = '';
    }
  }

  return puzzles;
}

/**
 * Validate puzzle structure
 */
function validatePuzzles(puzzles: SourcePuzzle[]): {
  valid: number;
  invalid: number;
  issues: string[];
} {
  const issues: string[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (const puzzle of puzzles) {
    const errors: string[] = [];

    if (!puzzle.originalUrl.endsWith('.png')) {
      errors.push(`Original URL doesn't end with .png: ${puzzle.originalUrl}`);
    }

    if (!puzzle.differentUrl.endsWith('_d.png')) {
      errors.push(`Different URL doesn't end with _d.png: ${puzzle.differentUrl}`);
    }

    if (puzzle.sourceDifferences.length === 0) {
      errors.push(`No differences found`);
    }

    // Validate each difference has required coordinates
    for (const diff of puzzle.sourceDifferences) {
      if (typeof diff.x !== 'number' || typeof diff.y !== 'number' ||
          typeof diff.width !== 'number' || typeof diff.height !== 'number') {
        errors.push(`Invalid coordinates in difference ${diff.id}`);
      }
    }

    if (errors.length > 0) {
      invalidCount++;
      issues.push(`Puzzle ${puzzle.puzzleNumber} (${puzzle.id}): ${errors.join('; ')}`);
    } else {
      validCount++;
    }
  }

  return { valid: validCount, invalid: invalidCount, issues };
}

/**
 * Main extraction and output
 */
async function main() {
  const sqlPath = path.join(__dirname, '../seed/puzzles.sql');

  console.log('Starting puzzle dataset extraction...\n');

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  // Extract all puzzles
  const puzzles = await extractPuzzles(sqlPath);

  console.log(`✓ Extracted ${puzzles.length} puzzle records from SQL file\n`);

  // Validate
  const validation = validatePuzzles(puzzles);
  console.log(`Validation Results:`);
  console.log(`  Valid:   ${validation.valid}`);
  console.log(`  Invalid: ${validation.invalid}`);

  if (validation.issues.length > 0) {
    console.log(`\n⚠ Issues found:`);
    validation.issues.forEach((issue) => console.log(`  - ${issue}`));
  }

  // Generate summary
  console.log(`\nPuzzle Summary (by difference count):`);
  const diffCounts = new Map<number, number>();
  for (const puzzle of puzzles) {
    const count = puzzle.sourceDifferenceCount;
    diffCounts.set(count, (diffCounts.get(count) || 0) + 1);
  }

  const sorted = Array.from(diffCounts.entries()).sort((a, b) => b[0] - a[0]);
  for (const [count, num] of sorted) {
    console.log(`  ${count} differences: ${num} puzzles`);
  }

  // Output puzzles.json
  const outputPath = path.join(__dirname, '../../data/puzzles.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(puzzles, null, 2));
  console.log(`\n✓ Output written to: ${outputPath}`);

  // Output puzzle-list.json
  const playableList: PlayablePuzzleListItem[] = puzzles.map((p) => ({
    puzzleNumber: p.puzzleNumber,
    originalUrl: p.originalUrl,
    differentUrl: p.differentUrl,
    differenceCount: p.sourceDifferenceCount,
  }));

  const listPath = path.join(__dirname, '../../data/puzzle-list.json');
  fs.writeFileSync(listPath, JSON.stringify(playableList, null, 2));
  console.log(`✓ Puzzle list written to: ${listPath}`);

  // Final Report
  console.log(`\n${'='.repeat(50)}`);
  console.log('PUZZLE DATABASE EXTRACTION COMPLETE');
  console.log('='.repeat(50));
  console.log(`
Source:
  puzzles.sql (181 records from joe-brothers/differ)

Total puzzles:
  ${puzzles.length}

Successfully parsed:
  ${validation.valid}

Failed:
  ${validation.invalid}

Output Files:
  - data/puzzles.json (complete dataset with all coordinates)
  - data/puzzle-list.json (simple puzzle list)

${'='.repeat(50)}`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
