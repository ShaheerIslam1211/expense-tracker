import { useEffect } from "react";

declare global {
  interface Window {
    __expenseTrackerModalLockCount?: number;
    __expenseTrackerModalPrevOverflow?: string;
  }
}

export function useModalBehavior(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    const currentCount = window.__expenseTrackerModalLockCount ?? 0;
    if (currentCount === 0) {
      window.__expenseTrackerModalPrevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    window.__expenseTrackerModalLockCount = currentCount + 1;

    return () => {
      window.removeEventListener("keydown", onKeyDown);

      const nextCount = Math.max((window.__expenseTrackerModalLockCount ?? 1) - 1, 0);
      window.__expenseTrackerModalLockCount = nextCount;

      if (nextCount === 0) {
        document.body.style.overflow = window.__expenseTrackerModalPrevOverflow ?? "";
      }
    };
  }, [isOpen, onClose]);
}
