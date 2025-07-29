'use client';

import * as React from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { SystemUser } from '@/types';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: SystemUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Helper function to convert Firestore data to SystemUser
const fromFirestore = (data: any): SystemUser => {
  return {
    ...data,
    createdAt: (data.createdAt as Timestamp).toDate(),
  } as SystemUser;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SystemUser | null>(null);
  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = React.useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setFirebaseUser(null);
    const isAuthPage = pathname === '/login' || pathname === '/signup';
    if (!isAuthPage) {
      router.push('/login');
    }
  }, [router, pathname]);

  const fetchUserData = React.useCallback(async (fbUser: FirebaseUser) => {
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = fromFirestore(userDoc.data());
      if (userData.status === 'active') {
        setUser(userData);
      } else {
        await handleSignOut();
      }
    } else {
      await handleSignOut();
    }
  }, [handleSignOut]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setLoading(true);
        await fetchUserData(fbUser);
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
        const isAuthPage = pathname === '/login' || pathname === '/signup';
        if (!isAuthPage) {
          router.push('/login');
        }
      }
    });

    return () => unsubscribe();
  }, [fetchUserData, router, pathname]);

  const refreshUserData = React.useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
       const userDocRef = doc(db, 'users', currentUser.uid);
       const userDoc = await getDoc(userDocRef);
       if (userDoc.exists()) {
           setUser(fromFirestore(userDoc.data()));
       }
    }
  }, []);

  const value = { user, firebaseUser, loading, refreshUserData };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
