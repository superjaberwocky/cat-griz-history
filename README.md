# Cat–Griz history

A responsive, static rivalry archive built with native JavaScript modules and Vite. No database, credentials, external fonts, or official logos are needed. Requires Node.js 20.19+ (or 22.12+); validated using Node 24.

## Develop

```sh
npm ci
npm run dev
```

## Validate and deploy

```sh
npm test
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static host. The site uses relative Vite asset URLs so it can also be hosted under a subdirectory. Filter state lives in URL query parameters; no server-side routing is required.

## Historical data and sources

**The supplied JSON has been imported.** The unchanged original is retained at `data/source/cat-griz.json`. Its 119 yearly records (1897–2023) produce 127 archive entries: 123 played games and four years explicitly described as not played. The original source totals are 42 Montana State wins, 76 Montana wins, and five ties. The project owner supplied three additional games in `data/source/updates.json`: 2024 (34–11), 2025 regular season (31–28), and the 2025 playoff rematch (48–23), all Montana State wins. The 2026 regular-season result (42–16) and recap draw on [Montana State Athletics](https://msubobcats.com/news/2026/11/21/football-big-second-half-lifts-bobcats-past-grizzlies). The combined archive has 131 entries, 127 played games, 46 Montana State wins, 76 Montana wins, and five ties. These totals describe the archive’s coverage.

- Original archive: https://www.hypercrit.net/catgriz/
- Montana State brand: https://www.montana.edu/brandtoolkit/
- Montana brand: https://www.umt.edu/brand/colors.php

MSU web colors were supplied by the project owner: blue `#162960`, gold `#f4b425`, and light gold `#fada92`. Montana colors were also supplied by the project owner: Griz maroon `#70002e`, sunset red `#F9423A`, and copper `#ED8B00`. Maroon is the primary Montana color; red and copper are available as accent tokens. The original live website and brand pages remain inaccessible through the environment network policy; the uploaded JSON was analyzed directly.

### Reproduce the import

```sh
python3 scripts/import-history.py
npm test
npm run build
```

The importer uses only the Python standard library. It expands each `_2` score pair into a separate game and decodes HTML entities into plain text. Narratives in original two-game years describe the year collectively and are labeled accordingly on both cards; source score-pair order is preserved.

1911, 1915, 1918, and 2020 explicitly describe games not played. Their original 0–0 placeholders become `status: "not-played"` with null scores. They remain searchable and filterable but are excluded from series totals and ties. Actual scoreless ties are preserved. Largest-margin sorting places unplayed entries last.

`data/games.json` contains source metadata and normalized entries. Each entry has a unique `id`, integer `year`, `status`, source game number, scores, nullable `location`, and plain-text `notes`. Game dates come from the rivalry results table and documented historical sources. Each matched date includes a source URL. The supplemental 2024–2026 records include cities, individual game narratives (`notesScope: "game"`), and meeting labels. These locations enable the location filter; historical locations are supplemented from Wikipedia as described below. The importer merges both source files so rerunning it preserves the updates. Eight years absent from the source (1905–1907, 1924, 1942–1945) are not fabricated as entries. Coverage extends through the 2026 regular-season meeting and includes the 2025 playoff rematch.

Source narratives are retained without factual corrections, including possible inconsistencies in narrative/score ordering and championship descriptions. Their historical accuracy remains to be checked against authoritative records. The original file is preserved for that review.

`src/history.js` validates imported records and implements filtering, sorting, and totals. Tests cover synthetic edge cases and every imported score pair, including double-game years and unplayed placeholders.

## Remaining work

Review the imported record and narrative accuracy against authoritative sources, resolve missing-year coverage, and independently verify the owner-supplied 2024–2025 additions. The JSON migration is complete; the live site's original code and interaction patterns have not been inspected.

## GitHub Pages

In the repository's **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The `Deploy website to GitHub Pages` workflow tests, builds, and deploys `dist/` on pushes to `main`. You can also run it manually from the Actions tab after enabling Pages. The deployment job reports the live URL; the expected project address is https://superjaberwocky.github.io/cat-griz-history/.

## Wikipedia historical context and locations

The About the Brawl section summarizes the [Montana–Montana State football rivalry article](https://en.wikipedia.org/wiki/Montana%E2%80%93Montana_State_football_rivalry). The 125 rows in its game-results table are retained as date, location, and score matching data in `data/source/wikipedia-locations.json`. The importer joins by year and exact scores, or assigns a city when every candidate for a year lists the same city. Scores and original narratives remain unchanged. No modern stadium is assigned retrospectively to an older game.

Documented overrides in the same file supply dates and locations where university records or contemporary coverage identify the meeting. For example, Montana State Athletics documents the first game as November 25, 1897, in Missoula. The archive keeps the imported scores, including where other sources report different scores. The second listed 1919 entry remains undated because the sources consulted identify only the 6–6 game. Unplayed years retain null locations. Location filtering includes Butte. The imported archive's game counts and win totals differ from Wikipedia and are not presented as official series totals.


### Game-day weather

The archive has weather for 119 of 127 played games. **Warmest first** and **Coldest first** rank games by the midpoint of the game day's station high and low in °F. These readings describe the day at the weather station. Kickoff and on-field conditions can differ. Games with missing readings appear after ranked games. When station readings tie, the newer game appears first.

`data/source/game-weather.json` records the date, city, station ID, daily high and low, and a source link for each reading. Most readings are from [NOAA NCEI GHCN-Daily](https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily). The two 2025 readings come from archived National Weather Service reports. Historical station series can include predecessor sites. GHCN-Daily temperatures were converted from tenths of a degree Celsius to whole degrees Fahrenheit, and values flagged by NOAA quality checks were excluded.

The history importer merges this checked-in snapshot and checks each reading against the matched date and city. Running it requires no network access.
