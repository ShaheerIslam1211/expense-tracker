import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
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
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signUp: (params: {
    name: string
    age: number
    email: string
    password: string
  }) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const signUp: AuthContextValue['signUp'] = async ({
    name,
    age,
    email,
    password,
  }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (name) {
      await updateProfile(cred.user, { displayName: name })
    }
    await setDoc(doc(db, 'users', cred.user.uid), {
      name,
      age,
      email,
      createdAt: new Date().toISOString(),
    })
  }

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signInWithGoogle: AuthContextValue['signInWithGoogle'] = async () => {
    const provider = new GoogleAuthProvider()
    const cred: UserCredential = await signInWithPopup(auth, provider)
    const isNewUser =
      (cred as UserCredential & { _tokenResponse?: { isNewUser?: boolean } })
        ._tokenResponse?.isNewUser ?? false
    if (isNewUser) {
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: cred.user.displayName ?? '',
        email: cred.user.email ?? '',
        createdAt: new Date().toISOString(),
      })
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
    }),
    [user, loading]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

