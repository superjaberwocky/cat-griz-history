"""Normalize the supplied original archive without inventing missing facts."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = json.loads((ROOT / 'data/source/cat-griz.json').read_text())
# These source rows have 0–0 placeholders but explicitly describe games not played.
NOT_PLAYED = {1911, 1915, 1918, 2020}
records = []
for row in source['games']:
    year = row['year']
    for number in range(1, 3 if 'cats_score_2' in row else 2):
        suffix = '' if number == 1 else '_2'
        played = year not in NOT_PLAYED
        records.append({
            'id': f'{year}-{number}', 'year': year,
            'status': 'played' if played else 'not-played',
            'sourceGame': number,
            'gamesInYear': 2 if 'cats_score_2' in row else 1,
            'msuScore': row[f'cats_score{suffix}'] if played else None,
            'umScore': row[f'griz_score{suffix}'] if played else None,
            'location': None,
            'notes': html.unescape(row['narrative']).strip(),
            'notesScope': 'year',
        })
updates = json.loads((ROOT / 'data/source/updates.json').read_text())
records.extend(updates['games'])
locations = json.loads((ROOT / 'data/source/wikipedia-locations.json').read_text())
for game in records:
    if game['status'] != 'played':
        continue
    candidates = [row for row in locations['games'] if row['year'] == game['year']]
    exact = [row for row in candidates if (row['msuScore'], row['umScore']) == (game['msuScore'], game['umScore'])]
    cities = {row['location'] for row in (exact or candidates)}
    if len(cities) == 1:
        game['location'] = cities.pop()
        game['locationSource'] = locations['source']
archive = {
    'source': 'https://www.hypercrit.net/catgriz/',
    'sourceFile': 'source/cat-griz.json',
    'status': 'imported-from-user-supplied-source',
    'supplementalSourceFile': 'source/updates.json',
    'supplementalSource': updates['source'],
    'locationSourceFile': 'source/wikipedia-locations.json',
    'locationSource': locations['source'],
    'updatedThrough': max(row['year'] for row in records),
    'games': records,
}
(ROOT / 'data/games.json').write_text(json.dumps(archive, ensure_ascii=False, indent=2) + '\n')
print(f"Imported {len(source['games'])} year records as {len(records)} archive entries; {len(NOT_PLAYED)} not-played years.")
