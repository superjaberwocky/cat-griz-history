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

**The supplied JSON has been imported.** The unchanged original is retained at `data/source/cat-griz.json`. Its 119 yearly records (1897–2023) produce 127 archive entries: 123 played games and four years explicitly described as not played. The calculated source totals are 42 Montana State wins, 76 Montana wins, and five ties. These are totals of the supplied file, not an independently verified official series record.

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

The importer uses only the Python standard library. It expands each `_2` score pair into a separate game and decodes HTML entities into plain text. Narratives in two-game years describe the year collectively and are labeled accordingly on both cards; source score-pair order is preserved without inferring game dates.

1911, 1915, 1918, and 2020 explicitly describe games not played. Their original 0–0 placeholders become `status: "not-played"` with null scores. They remain searchable and filterable but are excluded from series totals and ties. Actual scoreless ties are preserved. Largest-margin sorting places unplayed entries last.

`data/games.json` contains source metadata and normalized entries. Each entry has a unique `id`, integer `year`, `status`, source game number, scores, nullable `location`, and plain-text `notes`. Dates and locations were not supplied as structured fields and are not inferred from narrative mentions. The location filter is disabled until locations are documented. Eight years absent from the source (1905–1907, 1924, 1942–1945) are not fabricated as entries. Coverage stops at 2023.

Source narratives are retained without factual corrections, including possible inconsistencies in narrative/score ordering and championship descriptions. Their historical accuracy remains to be checked against authoritative records. The original file is preserved for that review.

`src/history.js` validates imported records and implements filtering, sorting, and totals. Tests cover synthetic edge cases and every imported score pair, including double-game years and unplayed placeholders.

## Remaining work

Review the imported record and narrative accuracy against authoritative sources, resolve missing-year coverage, and add games after 2023 from documented sources. The JSON migration is complete; the live site's original code and interaction patterns have not been inspected.
