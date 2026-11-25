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

The user-supplied [Cat–Griz history CSV](data/source/cat_griz_history_with_weather_1897_2026.csv) governs played games, dates, scores, locations, season context, and weather. The converted archive covers 126 games through 2026. Montana State won 46 games on the field, Montana won 75, and five ended in ties. Montana has 74 official wins because it vacated the 2011 result. The four explicitly documented interruptions (1911, 1915, 1918, and 2020) come from the [original archive](https://www.hypercrit.net/catgriz/). The archive also records the four years the teams did not meet because of World War II (1942–1945). All eight interruptions appear in search and filters and are excluded from the series totals.

The original and supplemental sources in `data/source/` are retained for historical reference. Selected game stories draw on the [original archive](https://www.hypercrit.net/catgriz/) and recent recaps, including [Montana State Athletics’ 2026 recap](https://msubobcats.com/news/2026/11/21/football-big-second-half-lifts-bobcats-past-grizzlies). The institutional table, NCAA, Wikipedia, and KULR8 accounts in the CSV inform the expandable notes on disputed records.

Regenerate and verify the archive with the Python standard library and existing Node scripts.

```sh
python3 scripts/import-history.py
npm test
npm run build
```

### Game-day weather

108 games have a station high and low for the selected game date and city. **Warmest days** and **Coldest days** rank by the midpoint of those two temperatures. Games missing either value sort after the ranked games. Station observations describe the day, and the archive labels separately reported conditions at kickoff. The 2026 box score reports snow and 24°F at kickoff. The CSV supplies no daily high and low for that game.

## GitHub Pages

On pushes to `main`, the GitHub Actions workflow tests, builds, and deploys `dist/`. The site is served at https://superjaberwocky.github.io/cat-griz-history/.
