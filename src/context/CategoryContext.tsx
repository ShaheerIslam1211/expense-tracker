import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { CATEGORIES, type Category } from '../types'
import { db } from '../firebase'
import { useAuth } from './AuthContext'

interface CategoryContextValue {
  categories: Category[]
  customCategories: Category[]
  addCategory: (input: Pick<Category, 'name' | 'icon' | 'color'>) => Promise<void>
  updateCategory: (id: string, updates: Partial<Pick<Category, 'name' | 'icon' | 'color'>>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  getCategoryById: (id: string) => Category | undefined
  isSystemCategory: (id: string) => boolean
}

const CategoryContext = createContext<CategoryContextValue | null>(null)

export function CategoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [customCategories, setCustomCategories] = useState<Category[]>([])

  useEffect(() => {
    if (!user) {
      setCustomCategories([])
      return
    }
    const q = query(collection(db, 'users', user.uid, 'categories'), orderBy('name', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      const next: Category[] = snap.docs.map((d) => {
        const data = d.data() as Omit<Category, 'id'>
        return {
          id: d.id,
          name: data.name,
          icon: data.icon || '🏷️',
          color: data.color || '#64748b',
          isSystem: false,
        }
      })
      setCustomCategories(next)
    })
    return () => unsub()
  }, [user])

  const categories = useMemo(() => {
    const systemById = new Set(CATEGORIES.map((c) => c.id))
    const safeCustom = customCategories.filter((c) => !systemById.has(c.id))
    return [...CATEGORIES, ...safeCustom]
  }, [customCategories])

  const isSystemCategory = useCallback((id: string) => CATEGORIES.some((c) => c.id === id), [])

  const addCategory = useCallback(
    async (input: Pick<Category, 'name' | 'icon' | 'color'>) => {
      if (!user) return
      const base = input.name.trim()
      if (!base) return
      const generatedId = base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || `cat-${Date.now()}`
      const alreadyExists = categories.some(
        (c) => c.id === generatedId || c.name.toLowerCase() === base.toLowerCase()
      )
      if (alreadyExists) return
      await setDoc(doc(db, 'users', user.uid, 'categories', generatedId), {
        name: base,
        icon: input.icon?.trim() || '🏷️',
        color: input.color || '#64748b',
        createdAt: new Date().toISOString(),
      })
    },
    [user, categories]
  )

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Pick<Category, 'name' | 'icon' | 'color'>>) => {
      if (!user || isSystemCategory(id)) return
      const ref = doc(db, 'users', user.uid, 'categories', id)
      await updateDoc(ref, {
        ...(updates.name != null ? { name: updates.name.trim() } : {}),
        ...(updates.icon != null ? { icon: updates.icon.trim() || '🏷️' } : {}),
        ...(updates.color != null ? { color: updates.color } : {}),
      })
    },
    [user, isSystemCategory]
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!user || isSystemCategory(id)) return
      const ref = doc(db, 'users', user.uid, 'categories', id)
      await deleteDoc(ref)
    },
    [user, isSystemCategory]
  )

  const getCategoryById = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories]
  )

  const value = useMemo(
    () => ({
      categories,
      customCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      getCategoryById,
      isSystemCategory,
    }),
    [categories, customCategories, addCategory, updateCategory, deleteCategory, getCategoryById, isSystemCategory]
  )

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>
}

export function useCategories() {
  const ctx = useContext(CategoryContext)
  if (!ctx) throw new Error('useCategories must be used within CategoryProvider')
  return ctx
}

