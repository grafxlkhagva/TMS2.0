'use client';

import * as React from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SystemUser | null>(null);
  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserData = React.useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as SystemUser;
        if (userData.status === 'active') {
          setUser({
            ...userData,
             createdAt: (userData.createdAt as any).toDate(),
          });
        } else {
          // If user is not active, sign them out and redirect
          await auth.signOut();
          setUser(null);
          setFirebaseUser(null);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      } else {
         // If no user doc, sign them out
        await auth.signOut();
      }
    } else {
      setUser(null);
    }
  }, [router, pathname]);


  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await fetchUserData(fbUser);
      } else {
        setUser(null);
        const isAuthPage = pathname === '/login' || pathname === '/signup';
        if (!isAuthPage) {
          router.push('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserData, router, pathname]);

  const refreshUserData = React.useCallback(async () => {
    if (firebaseUser) {
        await fetchUserData(firebaseUser);
    }
  }, [firebaseUser, fetchUserData]);

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
