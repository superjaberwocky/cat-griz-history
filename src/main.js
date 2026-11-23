import './style.css';
import archive from '../data/games.json';
import { filterGames, formatGameDate, gameDayTemperature, gameMetrics, summarize, validateGames, winner } from './history.js';

const games = validateGames(archive.games);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const totals = summarize(games);
const official = games.findLast(game => game.seriesRecord)?.seriesRecord;
const locations = [...new Set(games.map(g=>g.location).filter(Boolean))].sort();
const facets = [
  { name: 'team', label: 'Outcome', choices: [['msu', 'Montana State wins'], ['um', 'Montana wins'], ['tie', 'Ties'], ['not-played', 'Not played']], value: winner },
  { name: 'decade', label: 'Decade', choices: [...new Set(games.map(g => Math.floor(g.year / 10) * 10))].sort((a, b) => b - a).map(d => [String(d), `${d}s`]), value: g => String(Math.floor(g.year / 10) * 10) },
  { name: 'venue', label: 'Location', choices: locations.map(v => [v, v]), value: g => g.location },
];
const ranges = [
  { name: 'year', label: 'Year' },
  { name: 'margin', label: 'Margin' },
  { name: 'points', label: 'Combined points' },
  { name: 'msuScore', label: 'Montana State points' },
  { name: 'umScore', label: 'Montana points' },
];
const sortChoices = [
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
  ['warmest', 'Warmest days'],
  ['coldest', 'Coldest days'],
  ['margin', 'Largest margin'],
  ['smallest-margin', 'Closest wins'],
  ['points', 'Most combined points'],
  ['msu-points', 'Most Montana State points'],
  ['um-points', 'Most Montana points'],
];

function facetMarkup({ name, label, choices }) {
  if (!choices.length) return '';
  return `<details class="filter-group" ${name === 'decade' ? '' : 'open'}><summary>${label}</summary>
    <fieldset><legend class="visually-hidden">${label}</legend>${choices.map(([value, label]) =>
      `<label class="filter-choice"><input type="checkbox" name="${name}" value="${escape(value)}"><span>${escape(label)}</span><span class="facet-count" aria-hidden="true"></span></label>`
    ).join('')}</fieldset></details>`;
}

function rangeMarkup({ name, label }) {
  const values = games.filter(g => name === 'year' || winner(g) !== 'not-played').map(gameMetrics[name]);
  if (!values.length) return '';
  return `<fieldset class="range"><legend>${label}</legend><div class="range-inputs">
    <label>From<input type="number" name="${name}Min" min="0" step="1" inputmode="numeric" placeholder="${Math.min(...values)}" aria-label="${label} from"></label>
    <label>To<input type="number" name="${name}Max" min="0" step="1" inputmode="numeric" placeholder="${Math.max(...values)}" aria-label="${label} to"></label>
  </div></fieldset>`;
}

document.querySelector('#app').innerHTML = `
<a class="skip" href="#archive">Skip to game archive</a>
<header class="masthead"><a href="#" class="wordmark">CAT<span>–</span>GRIZ<span class="wordmark-sub">THE RIVALRY ARCHIVE</span></a><a href="#about">About the Brawl <span aria-hidden="true">↗</span></a></header>
<main>
<section class="hero"><div class="hero-copy"><p class="eyebrow">TWO TEAMS. ONE BIG SKY.</p><h1>A state divided.<br><em>A history shared.</em></h1><p class="intro">Montana State. Montana. More than a century of rivalry games. Explore the games behind the Cat–Griz rivalry.</p><a class="explore" href="#archive">Explore the rivalry <span aria-hidden="true">↓</span></a></div><div class="rivalry-art" aria-label="Montana State Bobcats versus Montana Grizzlies"><div class="mountains" aria-hidden="true"></div><div class="school cats"><span>BOZEMAN, MT</span><strong>STATE</strong><small>MONTANA STATE UNIVERSITY</small></div><div class="versus">VS</div><div class="school griz"><span>MISSOULA, MT</span><strong>MONTANA</strong><small>UNIVERSITY OF MONTANA</small></div><p class="art-caption">THE TREASURE STATE'S DEFINING RIVALRY</p></div></section>
<section class="series" aria-label="Series results on the field"><div><span class="eyebrow">THE SERIES AT A GLANCE</span><p>On-field results through ${archive.updatedThrough}</p></div><div class="stat"><strong>${totals.total}</strong><span>GAMES</span></div><div class="stat cat-stat"><strong>${totals.msu}</strong><span>BOBCAT WINS</span></div><div class="stat griz-stat"><strong>${totals.um}</strong><span>GRIZZLY WINS</span></div><div class="stat"><strong>${totals.tie}</strong><span>TIES</span></div><p class="official-record">Official series wins through ${archive.updatedThrough} · Montana State ${official.officialMsu}, Montana ${official.officialUm}. Montana vacated its 2011 win.</p></section>
<section id="archive" class="archive"><div class="section-title"><div><p class="eyebrow">RESULTS AND STORIES</p><h2>The game archive<span>.</span></h2></div><p>Find your year. Relive the rivalry.</p></div>
<div class="archive-tools" role="search" aria-label="Search and sort historical games">
  <label>Search the archive<input form="filters" name="search" type="search" placeholder="Year, place, or keyword"></label>
  <label>Sort by<select id="sort" form="filters" name="sort">${sortChoices.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>
</div>
<div class="archive-layout">
  <button id="toggle-filters" class="filter-toggle" type="button" aria-expanded="false" aria-controls="filters">Filters <span aria-hidden="true">+</span></button>
  <form id="filters" class="filters" aria-label="Filter historical games">
    <div class="filter-heading"><h3>Filters</h3><button id="clear-filters" type="button">Clear all</button></div>
    <p class="filter-help">Choose any options within a group. Combine groups to narrow the results.</p>
    ${facets.map(facetMarkup).join('')}
    <details class="filter-group" open><summary>Year range</summary>${rangeMarkup(ranges[0])}</details>
    <details class="filter-group"><summary>Scores and margins</summary>
      <label class="filter-choice"><input type="checkbox" name="shutout" value="yes"><span>Shutouts only</span></label>
      ${ranges.slice(1).map(rangeMarkup).join('')}
    </details>
    <button id="show-results" class="show-results" type="button">Show results</button>
  </form>
  <div class="archive-results">
    <div class="results-bar"><p id="result-count" role="status" aria-live="polite"></p><div id="active-filters" class="active-filters" aria-label="Active filters"></div></div>
    <p id="weather-coverage" hidden></p>
    <div id="results" class="game-grid"></div>
  </div>
</div>
</section>
<section id="about" class="about"><p class="eyebrow">RIVALRY HISTORY</p><h2>About the Brawl</h2><div><p>The Brawl of the Wild is the football rivalry between the University of Montana Grizzlies and the Montana State University Bobcats. First played in 1897, it is also known as Cat–Griz or Griz–Cat. The Brawl of the Wild name has been used to promote the game since 1997.</p><p>Both universities became charter members of the Big Sky Conference in 1963. Since 1993, their regular-season meeting has served as the season finale, often influencing the conference championship and playoff qualification. Montana won 16 consecutive meetings from 1986 through 2001; Montana State ended that run in 2002.</p><p>Games are now hosted at Bobcat Stadium in Bozeman and Washington–Grizzly Stadium in Missoula. Butte hosted the series from 1926 through 1951, with an interruption during World War II.</p><p>The Great Divide Trophy, introduced in 2001 and created by sculptor Dave Samuelson, takes its name from the Continental Divide separating the universities. In December 2025, the teams met in the FCS semifinals for their first playoff matchup.</p><p class="fine">The archive’s dates, scores, locations, season records, and weather follow the supplied Cat–Griz history dataset. When sources disagree, the game card shows the archive’s selected result and lists other accounts in the details. The archive lists one meeting in 1919, a 6–6 tie.</p><p class="fine">Further reading · ${Object.entries(archive.sources).map(([name, url]) => `<a href="${escape(url)}">${escape(name)}</a>`).join(' · ')} · <a href="https://www.hypercrit.net/catgriz/">Original Cat–Griz archive</a></p></div></section>
</main><footer><span>CAT–GRIZ <small>THE RIVALRY ARCHIVE</small></span><a href="#">Back to top ↑</a></footer>`;
const form = document.querySelector('#filters');
const sort = document.querySelector('#sort');
const toggle = document.querySelector('#toggle-filters');
const chips = document.querySelector('#active-filters');
const count = document.querySelector('#result-count');
const checkboxFields = [...form.querySelectorAll('input[type="checkbox"]')];
const rangeFields = [...form.querySelectorAll('input[type="number"]')];
const search = form.elements.namedItem('search');
const params = new URLSearchParams(location.search);
const filterNames = new Set([...checkboxFields, ...rangeFields, search, sort].map(field => field.name));

for (const field of checkboxFields) {
  field.checked = params.getAll(field.name).includes(field.value);
  if (field.checked) field.closest('details').open = true;
}
for (const field of rangeFields) {
  const value = params.get(field.name);
  if (value && /^\d+$/.test(value)) {
    field.value = value;
    field.closest('details').open = true;
  }
}
search.value = params.get('search') || '';
if (sortChoices.some(([value]) => value === params.get('sort'))) sort.value = params.get('sort');

function readFilters() {
  const data = new FormData(form);
  const filters = Object.fromEntries(data);
  for (const { name } of facets) filters[name] = data.getAll(name);
  for (const field of rangeFields) {
    if (!field.validity.valid) delete filters[field.name];
  }
  filters.search = search.value.trim();
  return filters;
}

function updateSortOptions(filters, matches) {
  const played = matches.some(g => winner(g) !== 'not-played');
  const usesScore = name => filters[`${name}Min`] || filters[`${name}Max`];
  const hasWeather = matches.some(g => gameDayTemperature(g) !== null);
  const availability = {
    warmest: hasWeather,
    coldest: hasWeather,
    margin: played,
    'smallest-margin': matches.some(g => ['msu', 'um'].includes(winner(g))),
    points: played,
    'msu-points': played && (filters.team.includes('msu') || usesScore('msuScore')),
    'um-points': played && (filters.team.includes('um') || usesScore('umScore')),
  };
  for (const option of sort.options) {
    option.hidden = option.value !== sort.value && availability[option.value] === false;
  }
}

const seasonLabels = {
  coach: 'Head coach',
  record: 'Season record',
  conference: 'Conference',
  division: 'Division or association',
  titles: 'Conference titles through this season',
  postseason: 'Postseason',
  homeStadium: 'Home stadium',
};

function seasonDetails(team, season) {
  return `<div><h4>${team}</h4><dl>${Object.entries(seasonLabels).filter(([key]) => season[key]).map(([key, label]) =>
    `<div><dt>${label}</dt><dd>${escape(season[key])}</dd></div>`
  ).join('')}</dl></div>`;
}

function gameWeather(game, weatherSort) {
  const weather = game.weather;
  if (!weather) return '<p class="weather-summary">Weather unavailable</p>';
  const midpoint = gameDayTemperature(game);
  const kickoff = weather.kickoffF == null ? '' :
    `<span><strong>${weather.kickoffF}°F</strong> at kickoff${weather.conditions ? ` · ${escape(weather.conditions)}` : ''}</span>`;
  const daily = midpoint === null ? '' :
    `<span>Daily high <strong>${weather.highF}°F</strong> · Low <strong>${weather.lowF}°F</strong></span>`;
  const ranking = weatherSort && midpoint !== null ? `<span>Daily midpoint ${midpoint}°F</span>` : '';
  return `<p class="weather-summary">${kickoff}${daily}${ranking}</p>`;
}

function recordDisagreements(disagreements) {
  if (!disagreements) return '';
  return `<div class="record-disagreements"><h4>Where sources disagree</h4>${Object.entries(disagreements).map(([field, accounts]) =>
    `<p><strong>${escape(field)}</strong></p><ul>${accounts.map(({ source, value }) => {
      const display = field === 'Date' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatGameDate(value) : value;
      return `<li>${escape(source)} · ${escape(display)}</li>`;
    }).join('')}</ul>`
  ).join('')}</div>`;
}

function gameCard(game, result, weatherSort) {
  const { date, weather, seriesRecord } = game;
  const badge = result === 'tie' ? 'Tie game' : result === 'msu' ? 'Bobcat win' : 'Grizzly win';
  const location = escape(game.location) + (game.neutral ? ' · Neutral site' : '');
  const weatherSource = weather ? `<p>Weather source · <a href="${escape(weather.source)}">${escape(weather.station || 'Montana State Athletics')}</a>${weather.station ? ' · Daily station readings' : ''}</p>` : '';
  return `<article class="game-card ${result}">
    <div class="card-top"><h3><time datetime="${escape(date)}">${formatGameDate(date)}</time></h3><span class="badge">${badge}</span></div>
    <p class="location">${location}${game.gameLabel !== 'Regular season' ? ` · ${escape(game.gameLabel)}` : ''}</p>
    <div class="score ${result === 'msu' ? 'winning' : ''}"><span>Montana State</span><strong>${game.msuScore}</strong></div>
    <div class="score ${result === 'um' ? 'winning' : ''}"><span>Montana</span><strong>${game.umScore}</strong></div>
    ${game.vacated ? '<p class="record-note">Montana later vacated this win.</p>' : ''}
    ${game.dateDisputed ? '<p class="record-note">Historical sources give different dates.</p>' : ''}
    ${gameWeather(game, weatherSort)}
    <details class="game-details"><summary>Game and season details</summary>
      ${game.notes ? `<p>${escape(game.notes)}</p>` : ''}
      <p>On-field series record after this game · Montana State ${seriesRecord.msu} wins, Montana ${seriesRecord.um} wins, ${seriesRecord.tie} ${seriesRecord.tie === 1 ? 'tie' : 'ties'}.</p>
      ${seriesRecord.um !== seriesRecord.officialUm ? `<p>Official wins through this game · Montana State ${seriesRecord.officialMsu}, Montana ${seriesRecord.officialUm}.</p>` : ''}
      <div class="season-details">${seasonDetails('Montana State', game.msuSeason)}${seasonDetails('Montana', game.umSeason)}</div>
      ${game.bigSkyChampions ? `<p><strong>Big Sky champions</strong> · ${escape(game.bigSkyChampions)}</p>` : ''}
      ${weatherSource}
      ${recordDisagreements(game.disagreements)}
    </details>
  </article>`;
}

function renderFacets(filters) {
  for (const { name, value } of facets) {
    const counts = new Map();
    for (const game of filterGames(games, { ...filters, [name]: [] })) {
      const key = value(game);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    for (const field of checkboxFields.filter(field => field.name === name)) {
      const matches = counts.get(field.value) || 0;
      const label = field.closest('label');
      label.querySelector('.facet-count').textContent = matches;
      field.setAttribute('aria-label', `${label.children[1].textContent} (${matches})`);
    }
  }
}

function renderChips(filters) {
  const active = checkboxFields.filter(field => field.checked).map(field => ({
    name: field.name, value: field.value, label: field.closest('label').children[1].textContent,
  }));
  if (filters.search) active.unshift({ name: 'search', label: `Search “${filters.search}”` });
  for (const { name, label } of ranges) {
    const min = filters[`${name}Min`];
    const max = filters[`${name}Max`];
    if (!min && !max) continue;
    const interval = min && max
      ? `${Math.min(min, max)}–${Math.max(min, max)}`
      : min ? `${min} and up` : `up to ${max}`;
    active.push({ name, label: `${label} ${interval}` });
  }
  chips.innerHTML = active.map(({ name, value, label }) =>
    `<button type="button" data-filter="${name}" data-value="${escape(value)}" aria-label="Remove ${escape(label)}">${escape(label)} <span aria-hidden="true">×</span></button>`
  ).join('');
  toggle.innerHTML = `Filters${active.length ? ` (${active.length})` : ''} <span aria-hidden="true">${toggle.getAttribute('aria-expanded') === 'true' ? '−' : '+'}</span>`;
}

function syncUrl(filters) {
  const url = new URL(location.href);
  for (const name of filterNames) url.searchParams.delete(name);
  for (const [name, values] of Object.entries(filters)) {
    for (const value of [values].flat()) {
      if (value && !(name === 'sort' && value === 'newest')) url.searchParams.append(name, value);
    }
  }
  history.replaceState(null, '', url);
}

function render(sync = true) {
  const filters = readFilters();
  const filtered = filterGames(games, filters);
  const played = summarize(filtered).total;
  const weatherSort = filters.sort === 'warmest' || filters.sort === 'coldest';
  const coverage = document.querySelector('#weather-coverage');
  coverage.hidden = !weatherSort;
  if (weatherSort) {
    const ranked = filtered.filter(game => gameDayTemperature(game) !== null).length;
    coverage.textContent = `${ranked} of ${played} games have a daily high and low. Rankings use the midpoint of those station readings. Games without both readings appear last.`;
  }
  const unplayed = filtered.length - played;
  count.textContent = `${played} ${played === 1 ? 'game' : 'games'} played${unplayed ? ` · ${unplayed} not played` : ''}`;
  document.querySelector('#show-results').textContent = `Show ${filtered.length} ${filtered.length === 1 ? 'result' : 'results'}`;
  updateSortOptions(filters, filtered);
  renderFacets(filters);
  renderChips(filters);
  document.querySelector('#results').innerHTML = !games.length ? `<div class="empty"><span class="empty-symbol" aria-hidden="true">↗</span><h3>The next chapter starts here.</h3><p>The original archive is awaiting import. Historical scores will appear here once the source records have been retrieved and verified.</p><a href="https://www.hypercrit.net/catgriz/">Visit the original archive ↗</a></div>` : !filtered.length ? `<div class="empty"><h3>No games match these filters.</h3><p>Try another year, winner, or location, or reset the filters.</p></div>` : filtered.map(g=> {
    const result = winner(g);
    if (result === 'not-played') return `<article class="game-card not-played"><div class="card-top"><span>${g.year}</span><span class="badge">NOT PLAYED</span></div><h3>A pause in the rivalry</h3><p class="interruption-note">${escape(g.notes)}</p></article>`;
    return gameCard(g, result, weatherSort);
  }).join('');
  if (sync) syncUrl(filters);
}

function setFiltersOpen(open) {
  toggle.setAttribute('aria-expanded', String(open));
  form.classList.toggle('is-open', open);
  toggle.querySelector('span').textContent = open ? '−' : '+';
}

form.addEventListener('submit', event => event.preventDefault());
document.querySelector('.archive').addEventListener('input', event => {
  if (event.target.form === form) render();
});
toggle.addEventListener('click', () => setFiltersOpen(toggle.getAttribute('aria-expanded') === 'false'));
document.querySelector('#show-results').addEventListener('click', () => {
  setFiltersOpen(false);
  toggle.focus();
});
document.querySelector('#clear-filters').addEventListener('click', () => {
  form.reset();
  render();
});
chips.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const { filter, value } = button.dataset;
  const index = [...chips.children].indexOf(button);
  if (filter === 'search') search.value = '';
  else if (value) checkboxFields.find(field => field.name === filter && field.value === value).checked = false;
  else {
    form.elements.namedItem(`${filter}Min`).value = '';
    form.elements.namedItem(`${filter}Max`).value = '';
  }
  render();
  (chips.children[index] || chips.lastElementChild || search).focus();
});
render(false);
