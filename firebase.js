// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDEziw-KtY9EyrfhP570XEHvx96GA1s3tA",
  authDomain: "central-app-735d2.firebaseapp.com",
  projectId: "central-app-735d2",
  storageBucket: "central-app-735d2.firebasestorage.app",
  messagingSenderId: "683014007148",
  appId: "1:683014007148:web:610e99bb1272598c44ab49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
