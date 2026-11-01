import test from 'node:test';
import assert from 'node:assert/strict';
import { filterGames, summarize, validateGames } from '../src/history.js';
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
test('series totals distinguish both schools and ties',()=>{
  assert.deepEqual(summarize(games),{msu:1,um:1,tie:1,total:3});
  assert.deepEqual(summarize([]),{msu:0,um:0,tie:0,total:0});
});
test('import validation rejects duplicate games and invalid scores',()=>{
  assert.equal(validateGames(games),games);
  assert.throws(()=>validateGames([games[0],games[0]]),/unique/);
  assert.throws(()=>validateGames([{...games[0],msuScore:-1}]),/msuScore/);
  assert.throws(()=>validateGames([{...games[0],year:1800}]),/year/);
});

const archive = JSON.parse((await import('node:fs')).readFileSync(new URL('../data/games.json', import.meta.url), 'utf8'));
const source = JSON.parse((await import('node:fs')).readFileSync(new URL('../data/source/cat-griz.json', import.meta.url), 'utf8'));
test('supplied archive imports every score pair and preserves yearly narratives',()=>{
  validateGames(archive.games);
  assert.equal(source.games.length,119);
  assert.equal(archive.games.length,127);
  for (const row of source.games) {
    const entries = archive.games.filter(g=>g.year===row.year);
    assert.equal(entries.length, Object.hasOwn(row,'cats_score_2') ? 2 : 1);
    for (const g of entries) {
      if (g.status === 'played') {
        const suffix = g.sourceGame === 2 ? '_2' : '';
        assert.equal(g.msuScore,row[`cats_score${suffix}`]);
        assert.equal(g.umScore,row[`griz_score${suffix}`]);
      }
      assert.equal(g.location,null);
      assert.ok(g.notes.length>0);
      assert.equal(g.notesScope,'year');
      assert.doesNotMatch(g.notes,/&(?:apos|#8220|#8221);/);
    }
  }
  assert.match(archive.games.find(g=>g.year===1897).notes,/“Varsity”/);
});
test('unplayed placeholders do not become ties, while real scoreless games do',()=>{
  const unplayed = filterGames(archive.games,{team:'not-played'});
  assert.deepEqual(unplayed.map(g=>g.year),[2020,1918,1915,1911]);
  assert.ok(unplayed.every(g=>g.msuScore===null && g.umScore===null));
  assert.deepEqual(summarize(unplayed),{msu:0,um:0,tie:0,total:0});
  assert.deepEqual(summarize(archive.games),{msu:42,um:76,tie:5,total:123});
  assert.deepEqual(filterGames(archive.games,{team:'tie'}).map(g=>g.year),[1928,1919,1916,1910,1908]);
  assert.equal(filterGames(archive.games,{search:'pandemic'}).length,1);
  assert.ok(filterGames(archive.games,{sort:'margin'}).slice(-4).every(g=>g.status==='not-played'));
});
test('both meetings in 1898 are searchable and independently filterable',()=>{
  const entries = filterGames(archive.games,{search:'1898',sort:'oldest'});
  assert.deepEqual(entries.map(g=>g.id),['1898-1','1898-2']);
  assert.deepEqual(entries.map(g=>g.umScore),[6,16]);
  assert.equal(filterGames(archive.games,{search:'1898',team:'msu'}).length,0);
  assert.equal(filterGames(archive.games,{search:'1898',team:'um'}).length,2);
});
