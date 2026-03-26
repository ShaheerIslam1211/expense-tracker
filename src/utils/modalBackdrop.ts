/** Tailwind classes for frosted modal overlays; skipped when blur is off or reduced motion is on. */
export function modalBackdropBlurClass(blurEnabled: boolean, reducedMotion: boolean): string {
  if (!blurEnabled || reducedMotion) return "";
  return "backdrop-blur-md supports-[backdrop-filter]:backdrop-blur-lg";
}
