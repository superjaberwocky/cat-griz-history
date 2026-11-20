export function winner(game) {
  if (game.status === 'not-played') return 'not-played';
  return game.msuScore === game.umScore ? 'tie' : game.msuScore > game.umScore ? 'msu' : 'um';
}
function victoryMargin(game) {
  return Math.abs(game.msuScore - game.umScore);
}

export function gameDayTemperature(game) {
  if (game.status === 'not-played' || !game.weather) return null;
  return (game.weather.highF + game.weather.lowF) / 2;
}

export function filterGames(games, { search = '', team = '', decade = '', venue = '', shutout = '', sort = 'newest' } = {}) {
  const query = search.trim().toLowerCase();
  return games.filter(g => (!team || winner(g) === team)
    && (!decade || Math.floor(g.year / 10) * 10 === Number(decade))
    && (!venue || g.location === venue)
    && (shutout !== 'yes' || (g.status !== 'not-played' && ((g.msuScore === 0) !== (g.umScore === 0))))
    && (!query || [g.year, g.date, g.location, g.notes, g.msuScore, g.umScore].join(' ').toLowerCase().includes(query)))
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
      if (sort === 'margin' || sort === 'smallest-margin') {
        const unplayedOrder = Number(a.status === 'not-played') - Number(b.status === 'not-played');
        const byYear = b.year - a.year;
        if (unplayedOrder || a.status === 'not-played') return unplayedOrder || byYear;
        const aMargin = victoryMargin(a);
        const bMargin = victoryMargin(b);
        if (sort === 'margin') return bMargin - aMargin || byYear;
        return Number(aMargin === 0) - Number(bMargin === 0) || aMargin - bMargin || byYear;
      }
      return sort === 'oldest'
        ? a.year - b.year || (a.date || '').localeCompare(b.date || '') || (a.sourceGame || 1) - (b.sourceGame || 1)
        : b.year - a.year || (b.date || '').localeCompare(a.date || '') || (b.sourceGame || 1) - (a.sourceGame || 1);
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
      const { highF, lowF, station, source } = g.weather;
      if (g.status === 'not-played' || !g.date || !g.location
        || !Number.isFinite(highF) || !Number.isFinite(lowF) || lowF > highF
        || typeof station !== 'string' || !station.trim()
        || typeof source !== 'string' || !source.startsWith('https://')) {
        throw new Error(`Invalid weather record: ${g.id}`);
      }
    }
  }
  return games;
}
