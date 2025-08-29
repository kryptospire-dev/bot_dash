
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCeADpcb_D9i3YQgUCUOPVBbuMFTPHaCks",
  authDomain: "kriptospire.firebaseapp.com",
  projectId: "kriptospire",
  storageBucket: "kriptospire.appspot.com",
  messagingSenderId: "139011505597",
  appId: "1:139011505597:web:56c41fd1697c4ca41526d4",
  measurementId: "G-7C2LH2W3EM"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
