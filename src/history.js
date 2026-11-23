export function winner(game) {
  if (game.status === 'not-played') return 'not-played';
  return game.msuScore === game.umScore ? 'tie' : game.msuScore > game.umScore ? 'msu' : 'um';
}
function victoryMargin(game) {
  return Math.abs(game.msuScore - game.umScore);
}

export function gameDayTemperature(game) {
  if (game.status === 'not-played' || !Number.isFinite(game.weather?.highF) || !Number.isFinite(game.weather?.lowF)) return null;
  return (game.weather.highF + game.weather.lowF) / 2;
}

const calendarDate = new Intl.DateTimeFormat('en-US', {
  month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

export function formatGameDate(date) {
  return calendarDate.format(new Date(date + 'T00:00:00Z'));
}

export const gameMetrics = {
  year: game => game.year,
  margin: victoryMargin,
  points: game => game.msuScore + game.umScore,
  msuScore: game => game.msuScore,
  umScore: game => game.umScore,
};

function matchesChoice(selection, value) {
  return Array.isArray(selection) ? !selection.length || selection.includes(value) : !selection || selection === value;
}

function matchesRanges(game, filters) {
  return Object.entries(gameMetrics).every(([name, metric]) => {
    const min = filters[`${name}Min`];
    const max = filters[`${name}Max`];
    const hasMin = min != null && min !== '';
    const hasMax = max != null && max !== '';
    if (!hasMin && !hasMax) return true;
    if (name !== 'year' && game.status === 'not-played') return false;
    const value = metric(game);
    const lower = hasMin ? Number(min) : -Infinity;
    const upper = hasMax ? Number(max) : Infinity;
    return value >= Math.min(lower, upper) && value <= Math.max(lower, upper);
  });
}

const scoreSorts = new Map([
  ['points', gameMetrics.points],
  ['msu-points', gameMetrics.msuScore],
  ['um-points', gameMetrics.umScore],
]);

function newestFirst(a, b) {
  return b.year - a.year || (b.date || '').localeCompare(a.date || '') || (b.sourceGame || 1) - (a.sourceGame || 1);
}

export function filterGames(games, filters = {}) {
  const { search = '', team, decade, venue, shutout, sort = 'newest' } = filters;
  const query = search.trim().toLowerCase();
  const selectedDecades = Array.isArray(decade) ? decade.map(String) : decade && String(decade);
  const scoreSort = scoreSorts.get(sort);
  return games.filter(g => matchesChoice(team, winner(g))
    && matchesChoice(selectedDecades, String(Math.floor(g.year / 10) * 10))
    && matchesChoice(venue, g.location || '')
    && (shutout !== 'yes' || (g.status !== 'not-played' && ((g.msuScore === 0) !== (g.umScore === 0))))
    && matchesRanges(g, filters)
    && (!query || [g.year, g.date, g.location, g.date && formatGameDate(g.date), g.gameLabel, g.notes, g.msuScore, g.umScore,
      ...Object.values(g.msuSeason || {}), ...Object.values(g.umSeason || {}), g.bigSkyChampions].join(' ').toLowerCase().includes(query)))
    .sort((a, b) => {
      if (sort === 'warmest' || sort === 'coldest') {
        const aTemperature = gameDayTemperature(a);
        const bTemperature = gameDayTemperature(b);
        if (aTemperature === null || bTemperature === null) {
          const missingOrder = Number(aTemperature === null) - Number(bTemperature === null);
          if (missingOrder) return missingOrder;
        } else if (aTemperature !== bTemperature) {
          return sort === 'warmest' ? bTemperature - aTemperature : aTemperature - bTemperature;
        }
      }
      if (sort === 'margin' || sort === 'smallest-margin' || scoreSort) {
        const unplayedOrder = Number(a.status === 'not-played') - Number(b.status === 'not-played');
        const byYear = b.year - a.year;
        if (unplayedOrder || a.status === 'not-played') return unplayedOrder || byYear;
        if (scoreSort) return scoreSort(b) - scoreSort(a) || newestFirst(a, b);
        const aMargin = victoryMargin(a);
        const bMargin = victoryMargin(b);
        if (sort === 'margin') return bMargin - aMargin || newestFirst(a, b);
        return Number(aMargin === 0) - Number(bMargin === 0) || aMargin - bMargin || newestFirst(a, b);
      }
      return sort === 'oldest'
        ? a.year - b.year || (a.date || '').localeCompare(b.date || '') || (a.sourceGame || 1) - (b.sourceGame || 1)
        : newestFirst(a, b);
    });
}
export function summarize(games) {
  return games.reduce((s, g) => { if (g.status !== 'not-played') { s[winner(g)]++; s.total++; } return s; }, { msu: 0, um: 0, tie: 0, total: 0 });
}
export function validateGames(games) {
  if (!Array.isArray(games)) throw new Error('games must be an array');
  const ids = new Set();
  for (const g of games) {
    if (!g.id || ids.has(g.id)) throw new Error('Each game needs a unique id');
    ids.add(g.id);
    if (!Number.isInteger(g.year) || g.year < 1897 || g.year > new Date().getFullYear()) throw new Error(`Invalid year: ${g.id}`);
    if (g.status && !['played', 'not-played'].includes(g.status)) throw new Error(`Invalid status: ${g.id}`);
    if (g.status === 'not-played') {
      if (g.msuScore !== null || g.umScore !== null) throw new Error(`Unplayed entry must have null scores: ${g.id}`);
    } else for (const key of ['msuScore', 'umScore']) if (!Number.isInteger(g[key]) || g[key] < 0) throw new Error(`Invalid ${key}: ${g.id}`);
    if (g.location !== null && (typeof g.location !== 'string' || !g.location.trim())) throw new Error(`Missing location: ${g.id}`);
    if (g.weather) {
      const { highF, lowF, kickoffF, station, source } = g.weather;
      const hasDaily = highF != null || lowF != null;
      if (g.status === 'not-played' || !g.date || !g.location
        || (!hasDaily && !Number.isFinite(kickoffF))
        || (kickoffF != null && !Number.isFinite(kickoffF))
        || (hasDaily && (!Number.isFinite(highF) || !Number.isFinite(lowF) || lowF > highF
          || typeof station !== 'string' || !station.trim()))
        || typeof source !== 'string' || !source.startsWith('https://')) {
        throw new Error(`Invalid weather record: ${g.id}`);
      }
    }
  }
  return games;
}
