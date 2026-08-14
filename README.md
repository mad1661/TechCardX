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

## Reference data & the Update panel

Class tables and weight breaks change during the season (AHFS horsepower
adjustments, Classification Guide corrections, rulebook amendments). The
header shows the **version and last-updated date** of the data in use, and
when the website was last checked.

The **Update** panel does three things:

1. **Check nhraracer.com now** — fetches the watched pages (Classification
   Guides, AHFS, Indexes, Accepted Products) through public CORS relays,
   reports which pages changed since the last check, and automatically
   parses & applies any factored-HP change lines it can read (the
   "Chev 1969 396 375/405 change to 396 375/409" format).
2. Links every authoritative source page for manual review.
3. **Import/export** of the dataset as JSON (persisted in localStorage),
   plus reset to the bundled copy — for updates the live check can't read
   (PDF guides, rulebook weight-break tables).

Bundled official data (through 2026-08-10): the Class Guide &
Specifications changelog (factored-HP corrections are checked against
every uploaded card) and Chrysler 1964/65/68 engine blueprint specs
(displacement + advertised-HP combo validation for Mopar cards).

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
