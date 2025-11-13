import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

export interface ConnectionStatus {
  connected: boolean;
  auth: boolean;
  firestore: boolean;
  error?: string;
  firestoreError?: string;
  firestoreErrorCode?: string;
}

/**
 * Tests Firebase Authentication connection
 */
export const testAuthConnection = async (): Promise<boolean> => {
  try {
    // Check if auth is initialized
    if (!auth) {
      return false;
    }
    
    // If auth object exists, connection is working
    return true;
  } catch (error) {
    console.error('Auth connection test failed:', error);
    return false;
  }
};

/**
 * Tests Firestore connection by performing a read/write operation
 */
export const testFirestoreConnection = async (): Promise<{ success: boolean; error?: string; code?: string }> => {
  try {
    if (!db) {
      return { success: false, error: 'Firestore database object is not initialized' };
    }

    // First, try a simple read operation to see if Firestore is accessible
    // This is less likely to fail due to permissions
    const testDocRef = doc(db, '_connection_test', 'test');
    
    try {
      // Try to read the document (will return empty if it doesn't exist, which is fine)
      await getDoc(testDocRef);
      
      // If we can read (even if empty), Firestore is connected
      // Now try a write operation to test full functionality
      try {
        await setDoc(testDocRef, {
          timestamp: Timestamp.now(),
          test: true,
        }, { merge: true });
        
        // Verify the write worked
        const verifySnap = await getDoc(testDocRef);
        if (verifySnap.exists()) {
          return { success: true };
        }
        return { success: false, error: 'Write operation succeeded but document not found on read' };
      } catch (writeError: any) {
        // Write failed, but read worked - this might be a permissions issue
        if (writeError?.code === 'permission-denied') {
          return { 
            success: false, 
            error: 'Firestore is connected but write operations are denied. Check your security rules to allow writes to _connection_test collection.', 
            code: 'permission-denied' 
          };
        }
        throw writeError;
      }
    } catch (readError: any) {
      // Read also failed - this is a more serious connection issue
      if (readError?.code === 'permission-denied') {
        return { 
          success: false, 
          error: 'Firestore permission denied. Check your security rules.', 
          code: 'permission-denied' 
        };
      } else if (readError?.code === 'unavailable' || readError?.code === 'failed-precondition') {
        return { 
          success: false, 
          error: 'Firestore is unavailable. Make sure Firestore Database is created in Firebase Console.', 
          code: readError.code 
        };
      } else if (readError?.code === 'not-found') {
        return { 
          success: false, 
          error: 'Firestore database not found. Please create a Firestore database in Firebase Console.', 
          code: 'not-found' 
        };
      }
      throw readError;
    }
  } catch (error: any) {
    console.error('Firestore connection test failed:', error);
    return { 
      success: false, 
      error: error?.message || 'Unknown Firestore connection error', 
      code: error?.code 
    };
  }
};

/**
 * Tests complete Firebase connection (Auth + Firestore)
 */
export const testFirebaseConnection = async (): Promise<ConnectionStatus> => {
  const status: ConnectionStatus = {
    connected: false,
    auth: false,
    firestore: false,
  };

  try {
    // Test Auth
    status.auth = await testAuthConnection();
    
    // Test Firestore with detailed error information
    const firestoreTest = await testFirestoreConnection();
    status.firestore = firestoreTest.success;
    if (!firestoreTest.success) {
      status.firestoreError = firestoreTest.error;
      status.firestoreErrorCode = firestoreTest.code;
    }
    
    // Overall connection status
    status.connected = status.auth && status.firestore;
    
    if (!status.connected) {
      if (!status.auth && !status.firestore) {
        status.error = 'Firebase Auth and Firestore are not connected. Check your configuration.';
      } else if (!status.auth) {
        status.error = 'Firebase Auth is not connected. Check your configuration.';
      } else if (!status.firestore) {
        status.error = status.firestoreError || 'Firestore is not connected. Check your configuration and security rules.';
      }
    }
  } catch (error: any) {
    status.error = error.message || 'Unknown error occurred while testing Firebase connection';
    console.error('Firebase connection test error:', error);
  }

  return status;
};

/**
 * Validates Firebase configuration
 */
export const validateFirebaseConfig = (): { valid: boolean; missing: string[] } => {
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  const missing: string[] = [];

  requiredVars.forEach((varName) => {
    const value = import.meta.env[varName];
    if (!value || value.includes('your_') || value.includes('here')) {
      missing.push(varName);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
  };
};
