import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAF8SpueUVNFxLlsgnnafbx-GJQ-f-4Vnk",
  authDomain: "media-deep-dive.firebaseapp.com",
  projectId: "media-deep-dive",
  storageBucket: "media-deep-dive.firebasestorage.app",
  messagingSenderId: "545672977836",
  appId: "1:545672977836:web:ba386213ffd1c317f1ee09",
  measurementId: "G-HMTKBJR0CF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); 