import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyDFwdyglEkMHd6jRrIkukdeAaFs31w9oXg",
  authDomain:        "artspire-67303.firebaseapp.com",
  projectId:         "artspire-67303",
  storageBucket:     "artspire-67303.firebasestorage.app",
  messagingSenderId: "544974783704",
  appId:             "1:544974783704:web:6249ef24f5652f92f083ad",
};

const app = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
