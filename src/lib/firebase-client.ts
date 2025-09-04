
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCeADpcb_D9i3YQgUCUOPVBbuMFTPHaCks",
  authDomain: "kriptospire.firebaseapp.com",
  projectId: "kriptospire",
  storageBucket: "kriptospire.appspot.com",
  messagingSenderId: "139011505597",
  appId: "1:139011505597:web:56c41fd1697c4ca41526d4",
  measurementId: "G-7C2LH2W3EM"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn("Firestore persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a time.");
  } else if (err.code == 'unimplemented') {
    console.warn("Firestore persistence failed: The current browser does not support all of the features required to enable persistence.");
  }
});


export { app, db };
