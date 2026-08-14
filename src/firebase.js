// Firebase initialization for TechCardX.
//
// The web config below identifies the Firebase project on the client; it is
// not a secret (see https://firebase.google.com/docs/projects/api-keys).
// Access control is enforced by Firebase Security Rules, not by hiding
// these values.

import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdEqkrISPv071Z1PC-hbwBQ0CN6rksSdA",
  authDomain: "techcardx.firebaseapp.com",
  projectId: "techcardx",
  storageBucket: "techcardx.firebasestorage.app",
  messagingSenderId: "477795225563",
  appId: "1:477795225563:web:dd394e71dbfad79dae61fe"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app };
export default app;
