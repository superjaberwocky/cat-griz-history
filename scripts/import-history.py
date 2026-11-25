"""Generate the public archive from the supplied Cat–Griz history CSV."""
import csv
import json
import re
from collections import Counter
from datetime import date
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/source'
CSV_NAME = 'cat_griz_history_with_weather_1897_2026.csv'
INTERRUPTIONS = {
    1911: 'The game was canceled after Montana State player Charles Lange died from a football injury.',
    1915: 'Montana State declined to play. The rivalry resumed in 1916.',
    1918: 'The teams did not meet during the final year of World War I.',
    1942: 'The teams did not meet because of World War II.',
    1943: 'The teams did not meet because of World War II.',
    1944: 'The teams did not meet because of World War II.',
    1945: 'The teams did not meet because of World War II.',
    2020: 'The game was canceled during the COVID-19 pandemic.',
}
TEAMS = {'MSU': 'Montana State', 'UM': 'Montana', 'EWU': 'Eastern Washington'}

# The original archive groups its narratives by year. Later recaps identify individual games.
original_archive = json.loads((SOURCE / 'cat-griz.json').read_text(encoding='utf-8'))
year_notes = {game['year']: unescape(game['narrative']) for game in original_archive['games']}
recent_updates = json.loads((SOURCE / 'updates.json').read_text(encoding='utf-8'))
game_notes = {game['id']: game['notes'] for game in recent_updates['games']}

with (SOURCE / CSV_NAME).open(encoding='utf-8-sig', newline='') as stream:
    reader = csv.reader(stream)
    headers = next(reader)
    weather_start = headers.index('Temperature At Kickoff (F)')
    duplicate_start = headers.index('Temperature At Kickoff (F)', weather_start + 1)
    if headers[weather_start:duplicate_start] != headers[duplicate_start:]:
        raise ValueError('Unexpected duplicate weather headings')
    rows = []
    for cells in reader:
        if len(cells) != len(headers) or cells[weather_start:duplicate_start] != cells[duplicate_start:]:
            raise ValueError(f'Weather columns disagree for game {cells[0]}')
        rows.append(dict(zip(headers[:duplicate_start], cells[:duplicate_start])))

def clean(value):
    return value if value not in ('', 'N/A', 'None') else None

def team_season(row, team):
    fields = {
        'coach': 'Coach', 'record': 'Season Record', 'conference': 'Conference',
        'division': 'Division/Association', 'titles': 'Conference Titles (KULR8)',
        'postseason': 'Postseason (KULR8)', 'homeStadium': 'Stadium (KULR8)',
    }
    season = {key: clean(row[f'{team} {field}']) for key, field in fields.items()}
    if season['homeStadium'] == 'Bobocat Stadium':
        season['homeStadium'] = 'Bobcat Stadium'
    if season['postseason']:
        outcome, result = season['postseason'].split(' ', 1)
        verb = {'W': 'Won', 'L': 'Lost in', 'T': 'Tied in'}[outcome]
        result = result.replace(' vs ', ' against ')
        season['postseason'] = f'{verb} the {result}'
        season['postseason'] = re.sub(r'(?<=\d)-(?=\d)', '–', season['postseason'])
    if season['record']:
        season['record'] = season['record'].replace('-', '–').replace(' BSC', ' Big Sky')
    if season['titles']:
        season['titles'] = season['titles'].replace('BSC', 'Big Sky')
    return {key: value for key, value in season.items() if value}

def weather(row):
    kickoff = row['Temperature At Kickoff (F)']
    high = row['Daily Maximum (F)']
    low = row['Daily Minimum (F)']
    if not (kickoff or high or low):
        return None
    if (row['Weather Date'], row['Weather Location']) != (row['Date (YYYY-MM-DD)'], row['Location']):
        raise ValueError(f"Weather date or venue mismatch for game {row['Game Number']}")
    result = {'source': row['Weather Source URL']}
    if high and low:
        result.update(highF=int(high), lowF=int(low), station=row['Weather Station Name'],
                      stationId=row['Weather Station ID'])
    if kickoff:
        result['kickoffF'] = int(kickoff)
        if 'reports snow' in row['Weather Research Notes']:
            result['conditions'] = 'Snow'
    return result

def disagreements(row):
    for field in ('Date', 'Score', 'Location'):
        value = row[f'{field} Disagreement']
        if value:
            yield field, [dict(zip(('source', 'value'), claim.split(': ', 1)))
                          for claim in value.split('; ')]

year_counts = Counter(row['Year'] for row in rows)
counts = Counter()
records = []
for row in rows:
    year, number = int(row['Year']), int(row['Game in Year'])
    game_id = f'{year}-{number}'
    msu, um = int(row['Montana State Score']), int(row['Montana Score'])
    played_on = date.fromisoformat(row['Date (YYYY-MM-DD)'])
    winner = 'Montana State' if msu > um else 'Montana' if msu < um else 'Tie'
    vacated = row['2011 Vacated UM Win'] == 'Yes'
    counts[winner] += 1
    counts['vacated'] += vacated
    expected = (counts['Montana State'], counts['Montana'], counts['Tie'],
                counts['Montana State'], counts['Montana'] - counts['vacated'])
    recorded = tuple(int(row[key]) for key in (
        'MSU Wins On Field Through Game', 'UM Wins On Field Through Game',
        'Ties Through Game', 'MSU Official Wins Through Game', 'UM Official Wins Through Game'))
    if (expected != recorded or winner != row['Winner (On Field)'] or year != played_on.year
            or int(row['Game Number']) != len(records) + 1 or abs(msu - um) != int(row['Margin'])):
        raise ValueError(f'Inconsistent CSV record {game_id}')
    game = {
        'id': game_id, 'year': year, 'status': 'played',
        'sourceGame': number, 'gamesInYear': year_counts[row['Year']],
        'seriesGame': int(row['Game Number']), 'date': played_on.isoformat(),
        'dateDisputed': row['Date Certainty'] == 'Disputed',
        'gameLabel': row['Game Type'], 'location': row['Location'],
        'neutral': row['UM Home/Away Classification'] == 'Neutral',
        'msuScore': msu, 'umScore': um, 'vacated': vacated,
        'msuSeason': team_season(row, 'MSU'), 'umSeason': team_season(row, 'UM'),
        'seriesRecord': dict(zip(('msu', 'um', 'tie', 'officialMsu', 'officialUm'), recorded)),
    }
    champions = clean(row['Big Sky Champions'])
    if champions:
        game['bigSkyChampions'] = re.sub(r'\b(MSU|UM|EWU)\b', lambda match: TEAMS[match[0]], champions)
    if game_id in game_notes:
        game['notes'] = game_notes[game_id]
    elif year in year_notes:
        game['notes'] = year_notes[year]
        if game['gamesInYear'] > 1:
            game['notesScope'] = 'year'
    observations = weather(row)
    if observations:
        game['weather'] = observations
    claims = dict(disagreements(row))
    if claims:
        game['disagreements'] = claims
    records.append(game)

for year, note in INTERRUPTIONS.items():
    if str(year) not in year_counts:
        records.append({
            'id': f'{year}-1', 'year': year, 'status': 'not-played',
            'location': None, 'msuScore': None, 'umScore': None,
            'notes': year_notes.get(year, note),
        })

# The CSV's source lists are largely identical; show a single set of reading links.
links = {}
for row in rows:
    for citation in row['Sources'].split('; '):
        label, url = citation.split(': ', 1)
        if url.startswith('https://') and label != 'Cat-Griz History':
            links[label] = url
archive = {
    'sourceFile': f'source/{CSV_NAME}',
    'updatedThrough': max(row['year'] for row in records),
    'sources': links,
    'games': sorted(records, key=lambda game: (game['year'], game.get('sourceGame', 1))),
}
(ROOT / 'data/games.json').write_text(json.dumps(archive, ensure_ascii=False, indent=2) + '\n')
print(f"Imported {len(rows)} played games and {len(records) - len(rows)} interruptions.")
