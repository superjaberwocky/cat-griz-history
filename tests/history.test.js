import test from 'node:test';
import assert from 'node:assert/strict';
import { filterGames, formatGameDate, gameDayTemperature, summarize, validateGames } from '../src/history.js';
const games = [
  {id:'fixture-a',year:2000,location:'Bozeman',msuScore:10,umScore:7,notes:'Overtime'},
  {id:'fixture-b',year:2010,location:'Missoula',msuScore:0,umScore:21},
  {id:'fixture-c',year:2001,location:'Bozeman',msuScore:7,umScore:7}
];
test('combined filters find the matching game without changing source order',()=>{
  assert.deepEqual(filterGames(games,{search:'overtime',team:'msu',decade:'2000',venue:'Bozeman'}),[games[0]]);
  assert.equal(filterGames(games,{team:'um',venue:'Bozeman'}).length,0);
  assert.equal(games[0].id,'fixture-a');
});
test('ties and sorting use scores and numeric years',()=>{
  assert.deepEqual(filterGames(games,{team:'tie'}),[games[2]]);
  assert.deepEqual(filterGames(games,{sort:'newest'}).map(g=>g.year),[2010,2001,2000]);
  assert.deepEqual(filterGames(games,{sort:'oldest'}).map(g=>g.year),[2000,2001,2010]);
  assert.deepEqual(filterGames(games,{sort:'margin'}).map(g=>g.id),['fixture-b','fixture-a','fixture-c']);
});
test('weather sorting uses the daily midpoint and places missing records last', () => {
  const cold = {...games[0], weather: {highF: 14, lowF: -24}};
  const freezing = {...games[1], weather: {highF: 40, lowF: 24}};
  const warmer = {...games[2], weather: {highF: 38, lowF: 36}};
  const missing = {...games[0], year: 2019};
  const results = [missing, cold, freezing, warmer];
  assert.deepEqual(filterGames(results, {sort: 'coldest'}), [cold, freezing, warmer, missing]);
  assert.deepEqual(filterGames(results, {sort: 'warmest'}), [warmer, freezing, cold, missing]);
  assert.deepEqual(filterGames(results, {sort: 'warmest', venue: 'Bozeman'}), [warmer, cold, missing]);
});
test('series totals distinguish both schools and ties',()=>{
  assert.deepEqual(summarize(games),{msu:1,um:1,tie:1,total:3});
  assert.deepEqual(summarize([]),{msu:0,um:0,tie:0,total:0});
});
test('shutouts include either winner and exclude scoreless ties and unplayed games',()=>{
  const bobcatWin = {id:'bobcat-win',year:2002,msuScore:3,umScore:0};
  const scorelessTie = {id:'scoreless-tie',year:2003,msuScore:0,umScore:0};
  const unplayed = {id:'unplayed',year:2004,status:'not-played',msuScore:null,umScore:null};
  const results = [...games,bobcatWin,scorelessTie,unplayed];
  assert.deepEqual(filterGames(results,{shutout:'yes'}),[games[1],bobcatWin]);
  assert.deepEqual(filterGames(results,{shutout:'yes',team:'msu'}),[bobcatWin]);
  assert.deepEqual(filterGames(results,{shutout:'yes',sort:'smallest-margin'}),[bobcatWin,games[1]]);
  assert.deepEqual(filterGames(results,{sort:'smallest-margin'}),[
    bobcatWin,games[0],games[1],scorelessTie,games[2],unplayed
  ]);
});
test('import validation rejects duplicate games and invalid scores',()=>{
  assert.equal(validateGames(games),games);
  assert.throws(()=>validateGames([games[0],games[0]]),/unique/);
  assert.throws(()=>validateGames([{...games[0],msuScore:-1}]),/msuScore/);
  assert.throws(()=>validateGames([{...games[0],year:1800}]),/year/);
});

const archive = JSON.parse((await import('node:fs')).readFileSync(new URL('../data/games.json', import.meta.url), 'utf8'));
test('CSV corrections replace legacy dates, scores, and locations', () => {
  validateGames(archive.games);
  assert.equal(archive.games.length, 134);
  const list = archive.games.filter(game => game.status === 'played');
  assert.deepEqual(list.map(game => game.seriesGame), Array.from({ length: 126 }, (_, i) => i + 1));
  const corrected = Object.fromEntries(list.map(game =>
    [game.id, [game.date, game.location, game.msuScore, game.umScore]]));
  assert.deepEqual(corrected['1897-1'], ['1897-11-26', 'Missoula', 6, 18]);
  assert.deepEqual(corrected['1899-2'], ['1899-11-26', 'Missoula', 5, 0]);
  assert.deepEqual(corrected['1909-2'], ['1909-11-25', 'Missoula', 5, 15]);
  assert.deepEqual(corrected['1914-1'], ['1914-11-06', 'Missoula', 9, 26]);
  assert.deepEqual(corrected['1951-1'], ['1951-10-20', 'Butte', 0, 38]);
  assert.deepEqual(corrected['1952-1'], ['1952-11-01', 'Bozeman', 12, 35]);
  assert.equal(corrected['1919-2'], undefined);
  assert.equal(formatGameDate(corrected['1897-1'][0]), 'November 26, 1897');
  assert.equal(filterGames(list, { search: 'November 26, 1897' })[0].id, '1897-1');
});

test('the vacated Montana win counts only in on-field series totals', () => {
  const game = archive.games.find(game => game.id === '2011-1');
  assert.equal(game.vacated, true);
  assert.deepEqual([game.msuScore, game.umScore], [10, 36]);
  assert.deepEqual(archive.games.at(-1).seriesRecord, {
    msu: 46, um: 75, tie: 5, officialMsu: 46, officialUm: 74,
  });
});

test('unplayed placeholders do not become ties, while real scoreless games do',()=>{
  const unplayed = filterGames(archive.games,{team:'not-played'});
  assert.deepEqual(unplayed.map(g=>g.year),[2020,1945,1944,1943,1942,1918,1915,1911]);
  assert.ok(unplayed.every(g=>g.msuScore===null && g.umScore===null));
  assert.deepEqual(summarize(unplayed),{msu:0,um:0,tie:0,total:0});
  assert.deepEqual(summarize(archive.games),{msu:46,um:75,tie:5,total:126});
  assert.deepEqual(filterGames(archive.games,{team:'tie'}).map(g=>g.year),[1928,1919,1916,1910,1908]);
  assert.equal(filterGames(archive.games,{search:'pandemic'}).length,1);
  assert.ok(filterGames(archive.games,{sort:'margin'}).slice(-unplayed.length).every(g=>g.status==='not-played'));
});
test('both meetings in 1898 are searchable and independently filterable',()=>{
  const entries = filterGames(archive.games,{search:'1898',sort:'oldest'});
  assert.deepEqual(entries.map(g=>g.id),['1898-1','1898-2']);
  assert.deepEqual(entries.map(g=>g.umScore),[6,16]);
  assert.equal(filterGames(archive.games,{search:'1898',team:'msu'}).length,0);
  assert.equal(filterGames(archive.games,{search:'1898',team:'um'}).length,2);
});

test('recent updates preserve separate meetings, locations, notes, and chronology',()=>{
  assert.equal(archive.updatedThrough,2026);
  const recent = filterGames(archive.games).slice(0,4);
  assert.deepEqual(recent.map(g=>[g.id,g.msuScore,g.umScore,g.location]),[
    ['2026-1',42,16,'Bozeman'],['2025-2',48,23,'Bozeman'],['2025-1',31,28,'Missoula'],['2024-1',34,11,'Bozeman']
  ]);
  assert.equal(recent[0].date,'2026-11-21');
  assert.match(recent[0].notes,/582 total yards/);
  assert.equal(recent[1].gameLabel, 'FCS playoff semifinal');
  assert.match(recent[1].notes,/449 total yards/);
  assert.match(recent[2].notes,/Caden Dowler/);
  assert.match(recent[3].notes,/197 yards/);
  assert.deepEqual(filterGames(archive.games,{search:'2025',sort:'oldest'}).map(g=>g.id),['2025-1','2025-2']);
  assert.equal(filterGames(archive.games,{venue:'Missoula'})[0].id,'2025-1');
});

test('sourced locations include neutral sites and resolve double-game years',()=>{
  const city = id => archive.games.find(g=>g.id===id).location;
  assert.equal(city('1897-1'),'Missoula');
  assert.equal(city('1908-1'),'Missoula');
  assert.equal(city('1908-2'),'Bozeman');
  assert.equal(city('1909-2'),'Missoula');
  assert.equal(city('1909-1'),'Bozeman');
  assert.equal(city('1913-2'),'Missoula');
  assert.equal(city('1926-1'),'Butte');
  assert.equal(city('1950-1'),'Butte');
  assert.equal(city('1951-1'),'Butte');
  assert.ok(filterGames(archive.games,{venue:'Butte'}).every(g=>g.year>=1926 && g.year<=1951));
  assert.ok(archive.games.filter(g=>g.status==='not-played').every(g=>g.location===null));
});

test('game weather follows the matched dates, including the playoff rematch', () => {
  const rematch = archive.games.find(game => game.id === '2025-2');
  assert.equal(rematch.date, '2025-12-20');
  assert.deepEqual([rematch.weather.highF, rematch.weather.lowF], [35, 11]);
  assert.ok(archive.games.filter(game => game.weather).every(game => game.date && game.location));
  assert.equal(archive.games.find(game => game.id === '1897-1').weather, undefined);
  const newest = archive.games.at(-1);
  assert.equal(newest.weather.kickoffF, 24);
  assert.equal(newest.weather.conditions, 'Snow');
  assert.equal(gameDayTemperature(newest), null);
  assert.equal(archive.games.filter(game => gameDayTemperature(game) !== null).length, 108);
});

test('multiple values in one facet combine with other facets and inclusive ranges', () => {
  assert.deepEqual(filterGames(games, {
    team: ['msu', 'tie'],
    decade: ['2000', '2010'],
    venue: ['Bozeman'],
    yearMin: '2000',
    yearMax: '2001',
    pointsMin: '14',
    pointsMax: '17',
    umScoreMin: '7',
    marginMax: '3',
  }), [games[2], games[0]]);
  assert.deepEqual(filterGames(games, { marginMax: '0' }), [games[2]]);
});

test('score ranges exclude unplayed years and score sorts order the matching games', () => {
  const unplayed = { id: 'unplayed', year: 2004, status: 'not-played', msuScore: null, umScore: null };
  const entries = [...games, unplayed];
  assert.deepEqual(filterGames(entries, { pointsMin: '0', sort: 'points' }), [games[1], games[0], games[2]]);
  assert.deepEqual(filterGames(entries, { sort: 'msu-points' }), [games[0], games[2], games[1], unplayed]);
  assert.deepEqual(filterGames(entries, { sort: 'um-points' }), [games[1], games[2], games[0], unplayed]);
  assert.deepEqual(filterGames(entries, { yearMin: '2004', yearMax: '2004' }), [unplayed]);
});
