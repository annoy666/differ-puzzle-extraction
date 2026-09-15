#!/usr/bin/env python3
"""
Download and parse the complete puzzles.sql file from GitHub
and extract all 181 puzzles with their coordinates
"""

import requests
import json
import re
from typing import List, Dict, Any
import os

SQL_URL = "https://raw.githubusercontent.com/joe-brothers/differ/main/packages/server/scripts/seed/puzzles.sql"
CDN_BASE = "https://differ-assets.joe-brothers.com"

def download_sql_file() -> str:
    """Download the complete SQL file from GitHub"""
    print("📥 Downloading puzzles.sql from GitHub...")
    response = requests.get(SQL_URL, timeout=30)
    response.raise_for_status()
    print(f"✓ Downloaded {len(response.text)} bytes")
    return response.text

def parse_sql_insert(line: str) -> Dict[str, Any] | None:
    """Parse a single INSERT statement"""
    # Match: INSERT INTO puzzles (id, differences, path, extension) VALUES ('...', '[...]', '...', '...')
    pattern = r"INSERT INTO puzzles \(id, differences, path, extension\) VALUES \('([^']+)',\s*'(\[.*?\])',\s*'([^']+)',\s*'([^']+)'\)"
    match = re.search(pattern, line, re.DOTALL)
    
    if not match:
        return None
    
    puzzle_id, differences_json, puzzle_path, extension = match.groups()
    
    # Parse differences JSON
    try:
        differences = json.loads(differences_json)
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse JSON for puzzle {puzzle_id}: {e}")
        return None
    
    # Extract puzzle number from path
    puzzle_number = puzzle_path.split('/')[-1]
    
    # Transform differences
    source_differences = []
    for diff in differences:
        source_differences.append({
            "id": diff["id"],
            "x": diff["sp"]["x"],
            "y": diff["sp"]["y"],
            "width": diff["w"],
            "height": diff["h"]
        })
    
    return {
        "id": puzzle_id,
        "puzzleNumber": puzzle_number,
        "path": puzzle_path,
        "extension": extension,
        "originalUrl": f"{CDN_BASE}{puzzle_path}.{extension}",
        "differentUrl": f"{CDN_BASE}{puzzle_path}_d.{extension}",
        "sourceDifferenceCount": len(source_differences),
        "sourceDifferences": source_differences
    }

def extract_all_puzzles(sql_content: str) -> List[Dict[str, Any]]:
    """Extract all puzzles from SQL content"""
    # Split by INSERT statements
    insert_pattern = r"INSERT INTO puzzles.*?\);"
    insert_statements = re.findall(insert_pattern, sql_content, re.DOTALL)
    
    print(f"\n📊 Found {len(insert_statements)} INSERT statements")
    
    puzzles = []
    failed = 0
    
    for i, statement in enumerate(insert_statements, 1):
        puzzle = parse_sql_insert(statement)
        if puzzle:
            puzzles.append(puzzle)
            if i % 20 == 0:
                print(f"  Parsed {i}/{len(insert_statements)} records...")
        else:
            failed += 1
    
    print(f"\n✓ Successfully parsed: {len(puzzles)} puzzles")
    if failed > 0:
        print(f"❌ Failed: {failed} puzzles")
    
    return puzzles

def validate_puzzles(puzzles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Validate puzzle data"""
    issues = []
    valid_count = 0
    
    for puzzle in puzzles:
        errors = []
        
        if not puzzle["originalUrl"].endswith(".png"):
            errors.append(f"Original URL doesn't end with .png")
        
        if not puzzle["differentUrl"].endswith("_d.png"):
            errors.append(f"Different URL doesn't end with _d.png")
        
        if puzzle["sourceDifferenceCount"] == 0:
            errors.append("No differences found")
        
        if not errors:
            valid_count += 1
        else:
            issues.append(f"Puzzle {puzzle['puzzleNumber']}: {', '.join(errors)}")
    
    return {
        "valid": valid_count,
        "invalid": len(puzzles) - valid_count,
        "issues": issues
    }

def save_json(data: List[Dict[str, Any]], filename: str):
    """Save data to JSON file"""
    output_dir = os.path.dirname(filename)
    os.makedirs(output_dir, exist_ok=True)
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    size_mb = os.path.getsize(filename) / (1024 * 1024)
    print(f"✓ Saved to {filename} ({size_mb:.2f} MB)")

def create_puzzle_list(puzzles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Create simple puzzle list"""
    return [
        {
            "puzzleNumber": p["puzzleNumber"],
            "originalUrl": p["originalUrl"],
            "differentUrl": p["differentUrl"],
            "differenceCount": p["sourceDifferenceCount"]
        }
        for p in puzzles
    ]

def main():
    print("="*60)
    print("DIFFER PUZZLE DATASET EXTRACTION")
    print("="*60)
    
    try:
        # Download SQL
        sql_content = download_sql_file()
        
        # Extract puzzles
        puzzles = extract_all_puzzles(sql_content)
        
        # Validate
        print("\n🔍 Validating puzzles...")
        validation = validate_puzzles(puzzles)
        print(f"  Valid:   {validation['valid']}")
        print(f"  Invalid: {validation['invalid']}")
        
        if validation['issues']:
            print("\n⚠ Issues found:")
            for issue in validation['issues'][:10]:
                print(f"  - {issue}")
            if len(validation['issues']) > 10:
                print(f"  ... and {len(validation['issues']) - 10} more")
        
        # Statistics
        print("\n📊 Statistics:")
        diff_counts = {}
        for p in puzzles:
            count = p["sourceDifferenceCount"]
            diff_counts[count] = diff_counts.get(count, 0) + 1
        
        for count in sorted(diff_counts.keys(), reverse=True):
            print(f"  {count} differences: {diff_counts[count]} puzzles")
        
        # Save outputs
        print("\n💾 Saving outputs...")
        save_json(puzzles, "data/puzzles.json")
        save_json(create_puzzle_list(puzzles), "data/puzzle-list.json")
        
        # Summary
        print("\n" + "="*60)
        print("EXTRACTION COMPLETE")
        print("="*60)
        print(f"✓ Total puzzles: {len(puzzles)}")
        print(f"✓ Total coordinates: {len(puzzles) * 10} (10 per puzzle)")
        print(f"✓ Output: data/puzzles.json")
        print(f"✓ Reference: data/puzzle-list.json")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
