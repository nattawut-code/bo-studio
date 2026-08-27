import { app } from "./firebase-config.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export const db = getFirestore(app);

export const stateRef = doc(db, "bo-studio", "state");
export const presetsRef = doc(db, "bo-studio", "presets");

export {
    getDoc,
    setDoc,
    onSnapshot
};