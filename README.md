# TechCardX — Problem Child Finder

Screens NHRA tech card exports for Stock, Super Stock and Comp cars that
need a closer look before they're classed: missing or invalid classes,
weight/HP factors that don't fit the class, convertibles and station wagons
that the card doesn't admit to, garbled body descriptions, cross-make engine
swaps, expired licenses/memberships and more.

## Using it

1. Open the app and drop in a tech card export — both formats are
   auto-detected:
   - **TCND division export** (`Submission_ID`, `CarBike_Num`, …)
   - **Compulink track export** (`Car Number`, `License #`, …)
2. Cards are checked against the active NHRA reference dataset. Flags come
   in three levels: **problem** (blocks classing / likely wrong),
   **warning** (needs a human look) and **info** (worth knowing).
3. Click a row for details; filter by category or severity; export the
   flagged list to CSV for the tech shack.

## Reference data & the Update button

Class tables and weight breaks change during the season (AHFS horsepower
adjustments, Classification Guide corrections, rulebook amendments). The
header shows the **version and last-updated date** of the data in use.
The **Update** panel links the authoritative sources on nhraracer.com,
lets you **import** an updated dataset (JSON), **export** the current one
to edit, and reset to the bundled copy. Imported data is kept in the
browser (localStorage) and survives reloads.

> nhraracer.com publishes the guides as PDFs behind a plain website with no
> API, and browsers block cross-site scraping, so fully automatic scraping
> needs a small server component (e.g. Firebase Cloud Functions). The data
> layer is already separated so that can be added without touching the app.

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # production build into dist/
firebase deploy    # deploy to Firebase Hosting (techcardx project)
```

Firebase is initialized in [`src/firebase.js`](src/firebase.js). Key modules:

- `src/parsers.js` — upload format detection + normalization
- `src/refdata.js` — NHRA class tables, model dictionary, sources, update logic
- `src/rules.js` — the problem-child rules engine
- `src/main.js` / `index.html` — UI

## Disclaimer

This is a screening aid. Final classification is always per the current
NHRA Rulebook and Classification Guide.
