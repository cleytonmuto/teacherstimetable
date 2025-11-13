import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import type { FirebaseOptions } from 'firebase/app';

// Validate environment variables
const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value || value.includes('your_'))
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Firebase Configuration Error: Missing or invalid environment variables:', missingVars);
  console.error('Please check your .env file and ensure all Firebase credentials are set.');
}

const firebaseConfig: FirebaseOptions = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: requiredEnvVars.authDomain,
  projectId: requiredEnvVars.projectId,
  storageBucket: requiredEnvVars.storageBucket,
  messagingSenderId: requiredEnvVars.messagingSenderId,
  appId: requiredEnvVars.appId,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // Log successful initialization (only in development)
  if (import.meta.env.DEV) {
    console.log('✅ Firebase initialized successfully');
    console.log('📦 Project ID:', firebaseConfig.projectId);
    console.log('🔑 Auth Domain:', firebaseConfig.authDomain);
    console.log('💾 Storage Bucket:', firebaseConfig.storageBucket);
  }
} catch (error: any) {
  console.error('❌ Firebase initialization failed:', error);
  console.error('Error details:', {
    code: error?.code,
    message: error?.message,
    stack: error?.stack,
  });
  
  // Don't throw in production to allow app to load, but log the error
  if (import.meta.env.DEV) {
    throw new Error(`Failed to initialize Firebase: ${error?.message || 'Unknown error'}`);
  }
}

export { auth, db };
export default app;
