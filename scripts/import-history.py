"""Generate the public archive from the supplied Cat–Griz history CSV."""
import csv
import json
import re
from collections import Counter
from datetime import date
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

# Selected game stories from the original archive, edited against the CSV.
STORIES = {
    '1897-1': 'Montana won the first meeting in Missoula. The original archive puts the crowd at about 200.',
    '1898-1': 'The original archive describes a crowd of about 700 at Butler Field in Bozeman, where there were no bleachers.',
    '1909-1': 'Ed Winstanley kicked the only field goal of the game to give Montana a 3–0 win.',
    '1919-1': 'The teams played to a 6–6 tie in their first meeting after World War I.',
    '1926-1': 'In the first Butte meeting, Kelly returned a punt for a touchdown and kicked three extra points for Montana.',
    '1963-1': 'The teams met as Big Sky members for the first time. Dan Sundling rushed for 144 yards and Ken Christison scored twice for Montana State.',
    '1976-1': 'Paul Dennehy threw a third-quarter touchdown pass and ran for two scores. Montana State went on to win the Division II national championship.',
    '1984-1': 'David Pandt rushed for 118 yards after halftime as Montana State rallied from a 24–12 deficit. Mark Fellows had three sacks and an interception.',
    '2002-1': 'Freshman quarterback Travis Lulay threw a 53-yard touchdown pass to Junior Adams as Montana State ended Montana’s 16-game winning streak in the rivalry.',
    '2011-1': 'Peter Nguyen and Dan Moore each rushed for more than 100 yards and scored a touchdown for Montana.',
    '2024-1': 'Missoula native Adam Jones ran for 197 yards and two touchdowns as Montana State reclaimed the Great Divide Trophy and completed a 12–0 regular season.',
    '2025-1': 'Caden Dowler returned an interception 34 yards for a touchdown to put Montana State ahead in the third quarter. The Bobcats held on for their first win in Missoula since 2018.',
    '2025-2': 'Montana erased a 20–3 deficit to take a third-quarter lead. Montana State scored the final 28 points and finished with 449 total yards to advance to the national championship.',
    '2026-1': 'Montana State scored touchdowns on all five second-half possessions and finished with 582 total yards. Justin Lamson threw for 265 yards and three touchdowns and ran for another 123 yards.',
}

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
    if game_id in STORIES:
        game['notes'] = STORIES[game_id]
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
            'notes': note,
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
