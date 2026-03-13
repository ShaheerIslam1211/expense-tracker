import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
  type UserCredential,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import type { UserData } from "../types";

interface AuthContextValue {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (params: { name: string; age: number; email: string; password: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubFirestore: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        // Listen to user data in Firestore
        const { onSnapshot } = await import("firebase/firestore");
        unsubFirestore = onSnapshot(doc(db, "users", u.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserData;
            setUserData(data);
          }
        });
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const signUp: AuthContextValue["signUp"] = async ({ name, age, email, password }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      age,
      email,
      currency: "USD",
      theme: "system",
      createdAt: new Date().toISOString(),
    });
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle: AuthContextValue["signInWithGoogle"] = async () => {
    const provider = new GoogleAuthProvider();
    const cred: UserCredential = await signInWithPopup(auth, provider);
    const isNewUser =
      (cred as UserCredential & { _tokenResponse?: { isNewUser?: boolean } })._tokenResponse?.isNewUser ?? false;
    if (isNewUser) {
      await setDoc(doc(db, "users", cred.user.uid), {
        name: cred.user.displayName ?? "",
        email: cred.user.email ?? "",
        currency: "USD",
        theme: "system",
        createdAt: new Date().toISOString(),
      });
    }
  };

  const updateUserProfile = async (updates: Partial<UserData>) => {
    if (!user) return;
    const { updateDoc } = await import("firebase/firestore");
    const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined)) as Record<
      string,
      string | number | boolean | undefined
    >;
    await updateDoc(doc(db, "users", user.uid), cleanUpdates);

    if (updates.name) {
      await updateProfile(user, { displayName: updates.name });
    }
    if (updates.photoUrl) {
      await updateProfile(user, { photoURL: updates.photoUrl });
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const value = useMemo(
    () => ({
      user,
      userData,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateUserProfile,
    }),
    [user, userData, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
