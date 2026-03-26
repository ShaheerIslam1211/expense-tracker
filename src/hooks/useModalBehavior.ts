import { useEffect } from "react";
import { useAppSettings } from "../context/AppSettingsContext";
import { popBodyScrollLock, pushBodyScrollLock } from "../utils/bodyScrollLock";

export interface UseModalBehaviorOptions {
  /** When false, background scroll is not locked (overrides the app setting). */
  lockScroll?: boolean;
}

export function useModalBehavior(isOpen: boolean, onClose: () => void, options?: UseModalBehaviorOptions) {
  const { settings } = useAppSettings();
  const lockScroll = options?.lockScroll ?? settings.modalLockBackgroundScroll;

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    if (lockScroll) {
      pushBodyScrollLock();
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (lockScroll) {
        popBodyScrollLock();
      }
    };
  }, [isOpen, onClose, lockScroll]);
}
