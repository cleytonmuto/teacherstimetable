import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { formatCPF, validateCPF } from '../utils/cpfUtils';
import { initializeUsersCollection } from '../utils/firestoreInit';

interface AuthContextType {
  currentUser: User | null;
  login: (cpf: string, password: string) => Promise<void>;
  register: (cpf: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  userCPF: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userCPF, setUserCPF] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate internal identifier from CPF for Firebase Auth
  // Note: Firebase Auth requires an email format, but this is only used internally
  const generateInternalIdentifier = (cpf: string): string => {
    const cleanedCPF = formatCPF(cpf);
    return `${cleanedCPF}@teacherstimetable.local`;
  };

  // Get internal identifier from CPF by looking up in Firestore
  const getInternalIdentifier = async (cpf: string): Promise<string | null> => {
    const cleanedCPF = formatCPF(cpf);
    const q = query(collection(db, 'users'), where('cpf', '==', cleanedCPF));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    // Return the internal identifier (stored as internalId, fallback to email for backward compatibility)
    return userData.internalId || userData.email || null;
  };

  // Load user CPF when user is authenticated
  const loadUserCPF = async (userId: string) => {
    try {
      // First try direct document lookup using userId as document ID (preferred method)
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserCPF(userData.cpf || null);
        return;
      }
      
      // Fallback: Try to find user by userId field (for backward compatibility with old data)
      const q = query(collection(db, 'users'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setUserCPF(userData.cpf || null);
      }
    } catch (error) {
      console.error('Error loading user CPF:', error);
      // Don't throw - allow user to continue even if CPF can't be loaded
    }
  };

  const register = async (cpf: string, password: string) => {
    if (!validateCPF(cpf)) {
      throw new Error('CPF inválido. Verifique se o CPF está correto.');
    }

    const cleanedCPF = formatCPF(cpf);
    
    // Check if CPF already exists in Firestore
    try {
      const q = query(collection(db, 'users'), where('cpf', '==', cleanedCPF));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error('CPF já cadastrado. Use a opção de login.');
      }
    } catch (error: any) {
      // If it's our custom error, rethrow it
      if (error.message === 'CPF já cadastrado. Use a opção de login.') {
        throw error;
      }
      // Otherwise, it might be a Firestore permission error
      console.error('Error checking for existing CPF:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Erro de permissão. Verifique as regras de segurança do Firestore.');
      }
      throw new Error('Erro ao verificar CPF. Tente novamente.');
    }

    // Generate internal identifier for Firebase Auth (required by Firebase)
    const internalIdentifier = generateInternalIdentifier(cleanedCPF);

    let userCredential: any = null;
    let userId: string | null = null;

    try {
      // Step 1: Create Firebase Auth account
      // Note: Firebase Auth requires email format, but we only use CPF
      console.log('Creating Firebase Auth account for CPF:', cleanedCPF);
      userCredential = await createUserWithEmailAndPassword(auth, internalIdentifier, password);
      userId = userCredential.user.uid;
      console.log('✅ Firebase Auth account created:', userId);

      // Step 2: Store teacher data in Firestore using userId as document ID
      const userDocRef = doc(db, 'users', userId);
      console.log('Saving teacher data to Firestore...');
      
      await setDoc(userDocRef, {
        userId: userId,
        cpf: cleanedCPF,
        internalId: internalIdentifier, // Internal identifier for Firebase Auth (not shown to users)
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, { merge: false }); // merge: false ensures we don't overwrite existing data

      console.log('✅ Teacher data saved to Firestore');

      // Step 3: Verify the document was created successfully
      const createdDoc = await getDoc(userDocRef);
      if (!createdDoc.exists()) {
        console.error('❌ Document verification failed - document does not exist');
        throw new Error('Erro ao salvar dados do professor. O documento não foi criado.');
      }

      // Step 4: Verify the data is correct
      const userData = createdDoc.data();
      if (userData.cpf !== cleanedCPF) {
        console.error('❌ Document verification failed - CPF mismatch');
        throw new Error('Erro ao salvar dados do professor. Dados incorretos.');
      }

      console.log('✅ Registration completed successfully for CPF:', cleanedCPF);
      console.log('📄 User document ID:', userId);
      console.log('📄 User data:', userData);

      // Set user CPF in state (user should be automatically logged in via onAuthStateChanged)
      setUserCPF(cleanedCPF);

      // Return success - user will be automatically logged in by onAuthStateChanged
      return;
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este CPF já está cadastrado. Use a opção de login.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Senha muito fraca. Use pelo menos 6 caracteres.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Erro ao criar conta. Contate o suporte.');
      } else if (error.code === 'permission-denied') {
        // Firestore permission error
        console.error('Firestore permission denied. Check security rules.');
        throw new Error('Erro de permissão ao salvar dados. Verifique as regras de segurança do Firestore.');
      } else if (error.code === 'unavailable') {
        throw new Error('Serviço indisponível. Verifique sua conexão com a internet.');
      }
      
      // If Auth succeeded but Firestore failed, we should handle cleanup
      // Note: In production, you might want to delete the Auth user if Firestore fails
      // For now, we'll just throw the error and let the user try again
      if (userCredential && userId) {
        console.warn('⚠️ Auth account created but Firestore save failed. User ID:', userId);
        // In a production app, you might want to delete the auth user here:
        // await deleteUser(userCredential.user);
      }
      
      // Re-throw with a user-friendly message
      if (error.message) {
        throw error;
      }
      throw new Error('Erro ao registrar. Tente novamente mais tarde.');
    }
  };

  const login = async (cpf: string, password: string) => {
    if (!validateCPF(cpf)) {
      throw new Error('CPF inválido. Verifique se o CPF está correto.');
    }

    const cleanedCPF = formatCPF(cpf);
    
    // Look up internal identifier from CPF
    const internalIdentifier = await getInternalIdentifier(cleanedCPF);
    
    if (!internalIdentifier) {
      throw new Error('CPF não encontrado. Verifique o CPF ou registre-se primeiro.');
    }

    // Authenticate with Firebase using the internal identifier
    await signInWithEmailAndPassword(auth, internalIdentifier, password);
    
    // Load user CPF after successful login
    const user = auth.currentUser;
    if (user) {
      await loadUserCPF(user.uid);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserCPF(null);
  };

  useEffect(() => {
    // Initialize users collection on app start
    const initCollection = async () => {
      try {
        const result = await initializeUsersCollection();
        if (!result.success) {
          console.error('⚠️ Users collection initialization warning:', result.error);
          // Don't block the app, but log the warning
        }
      } catch (error) {
        console.error('Error initializing users collection:', error);
        // Don't block the app if initialization fails
      }
    };

    initCollection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadUserCPF(user.uid);
      } else {
        setUserCPF(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    login,
    register,
    logout,
    loading,
    userCPF,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
