import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
 apiKey: "AIzaSyCEjBd8vj_OwV5K2XorGF0UqrNgRPfrk2M",
  authDomain: "appcaradasrapaduras.firebaseapp.com",
  projectId: "appcaradasrapaduras",
  storageBucket: "appcaradasrapaduras.firebasestorage.app",
  messagingSenderId: "467660364774",
  appId: "1:467660364774:web:ff37f406d9e1db3cf39427"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };