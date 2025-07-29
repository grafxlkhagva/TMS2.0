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
  // Ensure createdAt is a Date object, handling both Firestore Timestamp and potential existing Date objects.
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt;
  return {
    ...data,
    createdAt: createdAt,
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

  const fetchUserData = React.useCallback(async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setFirebaseUser(null);
      setLoading(false);
      const isAuthPage = pathname === '/login' || pathname === '/signup';
      if (!isAuthPage) {
        router.push('/login');
      }
      return;
    }
    
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = fromFirestore(userDoc.data());
        if (userData.status === 'active') {
          setUser(userData);
        } else {
          // If user is pending or inactive, sign them out.
          await handleSignOut();
        }
      } else {
        // If user document doesn't exist, sign them out.
        await handleSignOut();
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      await handleSignOut();
    } finally {
      setLoading(false);
    }
  }, [handleSignOut, router, pathname]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      await fetchUserData(fbUser);
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  const refreshUserData = React.useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
       setLoading(true);
       const userDocRef = doc(db, 'users', currentUser.uid);
       const userDoc = await getDoc(userDocRef);
       if (userDoc.exists()) {
           const freshData = fromFirestore(userDoc.data());
           setUser(freshData);
       } else {
          await handleSignOut();
       }
       setLoading(false);
    }
  }, [handleSignOut]);

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
