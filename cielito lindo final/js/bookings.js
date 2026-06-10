// firebase-config.js — Firebase Compat
// Las claves se cargan desde las variables de entorno de Vercel (window.__*)
// o directamente como fallback para desarrollo local.
// IMPORTANTE: este archivo está en .gitignore

const firebaseConfig = {
  apiKey:            "AIzaSyAeHpQQWkDlmBaOrzc1XIvzLPGuxIfqD2M",
  authDomain:        "cielito-lindo-50c3f.firebaseapp.com",
  projectId:         "cielito-lindo-50c3f",
  storageBucket:     "cielito-lindo-50c3f.appspot.com",
  messagingSenderId: "591671052455",
  appId:             "1:591671052455:web:4bc22a201034d5e5ce7382"
};

firebase.initializeApp(firebaseConfig);

// Variables globales disponibles en todos los scripts
const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();
