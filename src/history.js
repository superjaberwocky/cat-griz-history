export function winner(game) {
  if (game.status === 'not-played') return 'not-played';
  return game.msuScore === game.umScore ? 'tie' : game.msuScore > game.umScore ? 'msu' : 'um';
}
export function filterGames(games, { search = '', team = '', decade = '', venue = '', sort = 'newest' } = {}) {
  const query = search.trim().toLowerCase();
  return games.filter(g => (!team || winner(g) === team)
    && (!decade || Math.floor(g.year / 10) * 10 === Number(decade))
    && (!venue || g.location === venue)
    && (!query || [g.year, g.date, g.location, g.notes, g.msuScore, g.umScore].join(' ').toLowerCase().includes(query)))
    .sort((a, b) => (sort === 'margin' && (a.status === 'not-played' || b.status === 'not-played'))
      ? Number(a.status === 'not-played') - Number(b.status === 'not-played') || b.year - a.year
      : sort === 'oldest' ? a.year - b.year || (a.date || '').localeCompare(b.date || '') || (a.sourceGame || 1) - (b.sourceGame || 1)
      : sort === 'margin' ? Math.abs(b.msuScore - b.umScore) - Math.abs(a.msuScore - a.umScore) || b.year - a.year
      : b.year - a.year || (b.date || '').localeCompare(a.date || '') || (b.sourceGame || 1) - (a.sourceGame || 1));
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
  }
  return games;
}
