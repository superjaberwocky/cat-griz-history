import './style.css';
import archive from '../data/games.json';
import { filterGames, summarize, validateGames, winner } from './history.js';

const games = validateGames(archive.games);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const totals = summarize(games);
const locations = [...new Set(games.map(g=>g.location).filter(Boolean))].sort();
document.querySelector('#app').innerHTML = `
<a class="skip" href="#archive">Skip to game archive</a>
<header class="masthead"><a href="#" class="wordmark">CAT<span>–</span>GRIZ<span class="wordmark-sub">THE RIVALRY ARCHIVE</span></a><a href="#about">About the archive <span aria-hidden="true">↗</span></a></header>
<main>
<section class="hero"><div class="hero-copy"><p class="eyebrow">TWO TEAMS. ONE BIG SKY.</p><h1>A state divided.<br><em>A history shared.</em></h1><p class="intro">Montana State. Montana. More than a century of Saturdays that mean a little more. Explore the games behind the Cat–Griz rivalry.</p><a class="explore" href="#archive">Explore the rivalry <span aria-hidden="true">↓</span></a></div><div class="rivalry-art" aria-label="Montana State Bobcats versus Montana Grizzlies"><div class="mountains" aria-hidden="true"></div><div class="school cats"><span>BOZEMAN, MT</span><strong>STATE</strong><small>MONTANA STATE UNIVERSITY</small></div><div class="versus">VS</div><div class="school griz"><span>MISSOULA, MT</span><strong>MONTANA</strong><small>UNIVERSITY OF MONTANA</small></div><p class="art-caption">THE TREASURE STATE'S DEFINING RIVALRY</p></div></section>
<section class="series" aria-label="Imported series statistics"><div><span class="eyebrow">THE SERIES AT A GLANCE</span><p>${games.length ? `Through ${Math.max(...games.map(g=>g.year))} · imported records` : 'Historical records awaiting import'}</p></div><div class="stat"><strong>${games.length ? totals.total : '—'}</strong><span>GAMES</span></div><div class="stat cat-stat"><strong>${games.length ? totals.msu : '—'}</strong><span>BOBCAT WINS</span></div><div class="stat griz-stat"><strong>${games.length ? totals.um : '—'}</strong><span>GRIZZLY WINS</span></div><div class="stat"><strong>${games.length ? totals.tie : '—'}</strong><span>TIES</span></div></section>
<section id="archive" class="archive"><div class="section-title"><div><p class="eyebrow">EVERY SATURDAY HAS A STORY</p><h2>The game archive<span>.</span></h2></div><p>Find your year. Relive the rivalry.</p></div>
<form id="filters" class="filters" role="search" aria-label="Filter historical games"><label class="search">Search the archive<input name="search" type="search" placeholder="Search a year, place, or moment…"></label><label>Winner<select name="team"><option value="">All results</option><option value="msu">Montana State</option><option value="um">Montana</option><option value="tie">Ties</option><option value="not-played">Not played</option></select></label><label>Decade<select name="decade"><option value="">All decades</option>${[...new Set(games.map(g=>Math.floor(g.year/10)*10))].sort((a,b)=>b-a).map(d=>`<option value="${d}">${d}s</option>`).join('')}</select></label><label>Location<select name="venue" ${locations.length ? '' : 'disabled'}><option value="">${locations.length ? 'All locations' : 'Not recorded in source'}</option>${locations.map(v=>`<option>${escape(v)}</option>`).join('')}</select></label><label>Sort by<select name="sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="margin">Largest margin</option></select></label></form>
<div class="results-bar"><p id="result-count" role="status" aria-live="polite"></p><button id="reset" type="button">Reset filters <span aria-hidden="true">↺</span></button></div><div id="results" class="game-grid"></div>
</section>
<section id="about" class="about"><p class="eyebrow">PRESERVING THE RIVALRY</p><h2>The games change.<br>The rivalry endures.</h2><div><p>A history of the Brawl of the Wild from 1897 to the present day.</p></div></section>
</main><footer><span>CAT–GRIZ <small>THE RIVALRY ARCHIVE</small></span><a href="#">Back to top ↑</a></footer>`;
const form = document.querySelector('#filters');
form.addEventListener('submit', e=>e.preventDefault());
const names = ['search','team','decade','venue','sort'];
const params = new URLSearchParams(location.search);
for (const name of names) {
  const field = form.elements.namedItem(name);
  if (params.has(name)) field.value = params.get(name);
  if (name === 'sort' && !field.value) field.value = 'newest';
}
function render(sync = true) {
  const values = Object.fromEntries(new FormData(form));
  const filtered = filterGames(games, values);
  document.querySelector('#result-count').textContent = `${filtered.length} archive ${filtered.length === 1 ? 'entry' : 'entries'} · ${summarize(filtered).total} games played`;
  document.querySelector('#results').innerHTML = !games.length ? `<div class="empty"><span class="empty-symbol" aria-hidden="true">↗</span><h3>The next chapter starts here.</h3><p>The original archive is awaiting import. Historical scores will appear here once the source records have been retrieved and verified.</p><a href="https://www.hypercrit.net/catgriz/">Visit the original archive ↗</a></div>` : !filtered.length ? `<div class="empty"><h3>No games match these filters.</h3><p>Try another year, winner, or location, or reset the filters.</p></div>` : filtered.map(g=> {
    const result = winner(g);
    if (result === 'not-played') return `<article class="game-card not-played"><div class="card-top"><span>${g.year}</span><span class="badge">NOT PLAYED</span></div><h3>A pause in the rivalry</h3><p class="interruption-note">${escape(g.notes)}</p></article>`;
    return `<article class="game-card ${result}"><div class="card-top"><span>${g.year}</span><span class="badge">${result === 'tie' ? 'TIE GAME' : result === 'msu' ? 'BOBCAT WIN' : 'GRIZZLY WIN'}</span></div><p class="location">${g.gamesInYear > 1 ? `Game ${g.sourceGame} of ${g.gamesInYear} · ` : ''}${g.gameLabel ? `${escape(g.gameLabel)} · ` : ''}${escape(g.location || 'Location not recorded')}${g.date ? ` · ${escape(g.date)}` : ''}</p><div class="score ${result === 'msu' ? 'winning' : ''}"><span>Montana State <small>BOBCATS</small></span><strong>${g.msuScore}</strong></div><div class="score ${result === 'um' ? 'winning' : ''}"><span>Montana <small>GRIZZLIES</small></span><strong>${g.umScore}</strong></div>${g.notes ? `<details><summary>${g.notesScope === 'year' && g.gamesInYear > 1 ? 'Year notes (shared by both games)' : 'Game notes'}</summary><p>${escape(g.notes)}</p></details>` : ''}</article>`;
  }).join('');
  if (sync) {const p = new URLSearchParams(); for(const [k,v] of Object.entries(values)) if(v && !(k==='sort'&&v==='newest')) p.set(k,v); history.replaceState(null,'',`${location.pathname}${p.size?'?'+p:''}${location.hash}`);}
}
form.addEventListener('input', ()=>render());
document.querySelector('#reset').addEventListener('click', ()=>{form.reset();render();});
render(false);
