import { db } from '../config/firebase';
import { collection, getDocs, query, limit, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

/**
 * Initializes and verifies the users collection in Firestore
 * This ensures the collection is accessible and ready for authentication
 * Note: In Firestore, collections are created automatically on first write,
 * but we verify accessibility and optionally create a system document
 */
export const initializeUsersCollection = async (): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> => {
  try {
    console.log('🔍 Initializing users collection...');

    const systemDocId = '_system_init';
    const systemDocRef = doc(db, 'users', systemDocId);

    // Check if system document already exists
    try {
      const systemDoc = await getDoc(systemDocRef);
      
      if (systemDoc.exists()) {
        console.log('✅ Users collection is already initialized');
        return {
          success: true,
          message: 'Users collection is ready for authentication',
        };
      }
    } catch (readError: any) {
      // If read fails, it might be permissions, but we'll try to create anyway
      console.log('ℹ️ System document not found, will create it...');
    }

    // Create system initialization document to ensure collection exists
    // This creates the collection if it doesn't exist
    try {
      console.log('📝 Creating users collection initialization document...');
      await setDoc(systemDocRef, {
        _system: true,
        initialized: true,
        initializedAt: Timestamp.now(),
        version: '1.0.0',
      });
      
      console.log('✅ Users collection initialized successfully');
      
      // Verify the collection is accessible by querying it
      try {
        const usersRef = collection(db, 'users');
        const testQuery = query(usersRef, limit(1));
        await getDocs(testQuery);
        console.log('✅ Users collection verified and accessible');
      } catch (verifyError: any) {
        console.warn('⚠️ Collection created but verification query failed:', verifyError);
        // Don't fail - collection exists, verification is just a check
      }
      
      return {
        success: true,
        message: 'Users collection created and ready for authentication',
      };
    } catch (writeError: any) {
      // Handle specific errors
      if (writeError.code === 'permission-denied') {
        console.error('❌ Permission denied: Cannot write to users collection');
        return {
          success: false,
          error: 'Permission denied. Check Firestore security rules to allow writes to _system_init document in users collection.',
        };
      } else if (writeError.code === 'failed-precondition' || writeError.code === 'not-found') {
        console.error('❌ Firestore database not initialized');
        return {
          success: false,
          error: 'Firestore database not initialized. Please create the database in Firebase Console.',
        };
      } else if (writeError.code === 'unavailable') {
        console.error('❌ Firestore is unavailable');
        return {
          success: false,
          error: 'Firestore is unavailable. Check your internet connection and Firebase project status.',
        };
      }
      
      console.error('❌ Failed to create users collection:', writeError);
      return {
        success: false,
        error: `Failed to initialize users collection: ${writeError.message || 'Unknown error'}`,
      };
    }
  } catch (error: any) {
    console.error('❌ Error initializing users collection:', error);
    return {
      success: false,
      error: error.message || 'Unknown error while initializing users collection',
    };
  }
};

/**
 * Verifies Firestore security rules allow access to users collection
 */
export const verifyUsersCollectionAccess = async (): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const testQuery = query(usersRef, limit(1));
    await getDocs(testQuery);
    return true;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.error('❌ Permission denied: Check Firestore security rules');
      return false;
    }
    console.error('❌ Error verifying users collection access:', error);
    return false;
  }
};
