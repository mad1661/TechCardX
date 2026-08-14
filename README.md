# TechCardX

Web app scaffold with Firebase initialized.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. The page confirms that Firebase initialized
against the `techcardx` project.

## Firebase

Firebase is initialized once in [`src/firebase.js`](src/firebase.js), which
exports the shared `app` instance. Import it wherever a Firebase service is
needed, e.g.:

```js
import { app } from "./firebase.js";
import { getAuth } from "firebase/auth";

const auth = getAuth(app);
```

The web config in `src/firebase.js` identifies the project on the client and
is [not a secret](https://firebase.google.com/docs/projects/api-keys) — access
control comes from Firebase Security Rules.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally
