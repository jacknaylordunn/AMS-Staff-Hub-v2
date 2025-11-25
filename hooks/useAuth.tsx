
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithBadge: (badgeId: string, password: string) => Promise<void>;
  loginWithPin: (badgeId: string, pin: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: Role, regNumber?: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  updatePin: (newPin: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to sanitize error messages
export const getFriendlyErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    
    const code = error.code;
    
    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Invalid email or password.';
        case 'auth/email-already-in-use':
            return 'An account with this email address already exists.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters.';
        case 'auth/too-many-requests':
            return 'Account temporarily locked due to multiple failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Unable to connect. Please check your internet connection.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/requires-recent-login':
            return 'Please log in again to verify your identity.';
        case 'permission-denied':
            return 'You do not have permission to perform this action.';
        case 'unavailable':
            return 'Service temporarily unavailable. Please check your connection.';
    }

    // Clean up generic Firebase messages
    let message = error.message || 'An unexpected error occurred.';
    if (message.includes('Firebase:')) {
        message = message.replace('Firebase: ', '');
        message = message.replace(/\(auth\/[-\w]+\)\.?/, '').trim();
        if (message.startsWith('Error: ')) message = message.substring(7);
    }
    return message;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUser(userData);
          } else {
            // Fallback if Firestore doc creation is lagging slightly
            setUser({
                uid: fbUser.uid,
                email: fbUser.email || '',
                name: fbUser.displayName || 'User',
                role: Role.Pending,
                status: 'Pending',
                compliance: []
            });
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      const msg = getFriendlyErrorMessage(err);
      setError(msg);
      throw new Error(msg); 
    }
  };

  const loginWithBadge = async (badgeId: string, password: string) => {
      setError(null);
      try {
          const q = query(collection(db, 'users'), where('employeeId', '==', badgeId));
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
              throw new Error("Invalid Employee Badge ID");
          }

          const userData = snapshot.docs[0].data();
          await login(userData.email, password);

      } catch (err: any) {
          console.error(err);
          const msg = getFriendlyErrorMessage(err);
          setError(msg);
          throw new Error(msg);
      }
  };

  const loginWithPin = async (badgeId: string, pin: string) => {
    // Note: True secure PIN login requires a backend custom token generator.
    // For this implementation, we use Login with Badge + Password as primary.
    // PIN is used for signing actions.
    throw new Error("Please use Badge ID + Password for initial login.");
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
      if (!user) return false;
      try {
          // Fetch fresh doc to ensure PIN matches server state
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
              const data = userDoc.data() as User;
              return data.pin === pin;
          }
          return false;
      } catch (e) {
          console.error("PIN Verification Error", e);
          return false;
      }
  };

  const updatePin = async (newPin: string) => {
      if (!user) return;
      if (!/^\d{4}$/.test(newPin)) throw new Error("PIN must be 4 digits.");
      
      try {
          await updateDoc(doc(db, 'users', user.uid), {
              pin: newPin,
              pinLastUpdated: new Date().toISOString()
          });
          await refreshUser();
      } catch (e) {
          throw new Error("Failed to update PIN");
      }
  };

  const register = async (email: string, password: string, name: string, role: Role, regNumber?: string) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      // Send verification before proceeding
      await sendEmailVerification(fbUser);

      const newUser: User = {
        uid: fbUser.uid,
        email,
        name,
        role,
        status: 'Pending',
        regNumber,
        compliance: []
      };

      await setDoc(doc(db, 'users', fbUser.uid), newUser);
      
      // Update local state immediately to speed up UI transition
      setUser(newUser);
      setFirebaseUser(fbUser);
      
    } catch (err: any) {
      console.error(err);
      const msg = getFriendlyErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const reauthenticate = async (password: string): Promise<boolean> => {
      if (!auth.currentUser || !auth.currentUser.email) return false;
      try {
          const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
          await reauthenticateWithCredential(auth.currentUser, credential);
          return true;
      } catch (err) {
          console.error("Reauth failed", err);
          return false;
      }
  };

  const refreshUser = async () => {
      if (auth.currentUser) {
          try {
              await auth.currentUser.reload();
              // Create a new object reference to force React to detect change
              const updatedUser = auth.currentUser; 
              setFirebaseUser({ ...updatedUser } as FirebaseUser);
              
              // Re-fetch profile to ensure role/status is up to date
              const userDocRef = doc(db, 'users', updatedUser.uid);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                  setUser(userDoc.data() as User);
              }
          } catch (err) {
              console.error("Error refreshing user", err);
          }
      }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, login, loginWithBadge, loginWithPin, verifyPin, updatePin, register, reauthenticate, logout, refreshUser, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
