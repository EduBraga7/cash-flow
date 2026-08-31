'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (name: string, e: string, p: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInWithGoogle: async () => {},
  resetPassword: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (e: string, p: string) => {
    if (!auth) throw new Error('Firebase Auth não inicializado.');
    await signInWithEmailAndPassword(auth, e.trim(), p);
  };

  const signUpWithEmail = async (name: string, e: string, p: string) => {
    if (!auth) throw new Error('Firebase Auth não inicializado.');
    const userCredential = await createUserWithEmailAndPassword(auth, e.trim(), p);
    if (userCredential.user && name.trim()) {
      await updateProfile(userCredential.user, {
        displayName: name.trim(),
      });
      // Atualiza o estado local com o nome
      setUser({ ...userCredential.user, displayName: name.trim() } as User);
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth não inicializado.');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error('Firebase Auth não inicializado.');
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
