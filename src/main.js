import { app } from "./firebase.js";

const status = document.querySelector("#firebase-status");
status.textContent = `Firebase initialized: project "${app.options.projectId}"`;
