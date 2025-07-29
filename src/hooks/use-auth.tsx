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

  const fetchUserData = React.useCallback(async (fbUser: FirebaseUser, isInitialAuth: boolean) => {
    if (fbUser) {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as SystemUser;
        // Only check status and redirect on initial authentication state change
        if (isInitialAuth && userData.status !== 'active') {
          await auth.signOut();
          setUser(null);
          setFirebaseUser(null);
          // Redirect to login only if not already on an auth page
          if (pathname !== '/login' && pathname !== '/signup') {
            router.push('/login');
          }
        } else {
           setUser({
            ...userData,
             createdAt: (userData.createdAt as any).toDate(),
          });
        }
      } else {
         // If no user doc, sign them out
        await auth.signOut();
        setUser(null);
        setFirebaseUser(null);
      }
    } else {
      setUser(null);
      setFirebaseUser(null);
    }
  }, [router, pathname]);


  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await fetchUserData(fbUser, true); // `true` indicates this is the initial auth check
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
    if (auth.currentUser) {
        // `false` indicates this is a manual refresh, not the initial auth check
        await fetchUserData(auth.currentUser, false);
    }
  }, [fetchUserData]);

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
