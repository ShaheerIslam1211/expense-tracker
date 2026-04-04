import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_CATEGORIES } from "../data/categorySeed";

/**
 * First sign-in / legacy users: creates any missing default category docs and sets
 * `categoryCatalogInitialized` on the user profile. After that, never recreates
 * defaults the user deleted — only merges routing metadata onto docs that still exist.
 */
export async function syncCategoryDefaults(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const catalogInitialized =
    userSnap.exists() &&
    (userSnap.data() as { categoryCatalogInitialized?: boolean }).categoryCatalogInitialized === true;

  const colRef = collection(db, "users", uid, "categories");
  const snap = await getDocs(colRef);
  const existing = new Set(snap.docs.map((d) => d.id));
  const byId = new Map(snap.docs.map((d) => [d.id, d.data()]));

  if (!catalogInitialized) {
    for (const c of DEFAULT_CATEGORIES) {
      const ref = doc(colRef, c.id);
      if (!existing.has(c.id)) {
        await setDoc(ref, {
          name: c.name,
          icon: c.icon,
          color: c.color,
          isSystem: true,
          sortOrder: c.sortOrder,
          forIncome: c.forIncome,
          forExpense: c.forExpense,
        });
      } else {
        const prev = byId.get(c.id);
        if (!prev) continue;
        const needsMeta =
          prev.sortOrder !== c.sortOrder ||
          prev.forIncome !== c.forIncome ||
          prev.forExpense !== c.forExpense ||
          prev.isSystem !== true;
        if (needsMeta) {
          await setDoc(
            ref,
            {
              sortOrder: c.sortOrder,
              forIncome: c.forIncome,
              forExpense: c.forExpense,
              isSystem: true,
            },
            { merge: true },
          );
        }
      }
    }
    await setDoc(userRef, { categoryCatalogInitialized: true }, { merge: true });
    return;
  }

  for (const c of DEFAULT_CATEGORIES) {
    if (!existing.has(c.id)) continue;
    const prev = byId.get(c.id);
    if (!prev) continue;
    const needsMeta =
      prev.sortOrder !== c.sortOrder ||
      prev.forIncome !== c.forIncome ||
      prev.forExpense !== c.forExpense ||
      prev.isSystem !== true;
    if (needsMeta) {
      await setDoc(
        doc(colRef, c.id),
        {
          sortOrder: c.sortOrder,
          forIncome: c.forIncome,
          forExpense: c.forExpense,
          isSystem: true,
        },
        { merge: true },
      );
    }
  }
}

/** Re-add only default category documents that are missing (user may have deleted some). */
export async function restoreMissingDefaultCategories(uid: string): Promise<void> {
  const colRef = collection(db, "users", uid, "categories");
  const snap = await getDocs(colRef);
  const existing = new Set(snap.docs.map((d) => d.id));

  for (const c of DEFAULT_CATEGORIES) {
    if (existing.has(c.id)) continue;
    await setDoc(doc(colRef, c.id), {
      name: c.name,
      icon: c.icon,
      color: c.color,
      isSystem: true,
      sortOrder: c.sortOrder,
      forIncome: c.forIncome,
      forExpense: c.forExpense,
    });
  }
}
