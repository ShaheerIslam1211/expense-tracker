const KEY = "__expenseTrackerScrollLock_v2" as const;

type ScrollLockState = {
  depth: number;
  scrollY: number;
  htmlOverflow: string;
  htmlHeight: string;
  htmlOverscroll: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyTouchAction: string;
  bodyPaddingRight: string;
};

function read(): ScrollLockState | undefined {
  return (window as unknown as { [KEY]?: ScrollLockState })[KEY];
}

function write(next: ScrollLockState | undefined) {
  (window as unknown as { [KEY]?: ScrollLockState })[KEY] = next;
}

/**
 * Locks document scroll (mobile + desktop). Nesting-safe: pair with {@link popBodyScrollLock}.
 * Uses position:fixed on body to stop iOS background rubber-banding.
 */
export function pushBodyScrollLock(): void {
  const html = document.documentElement;
  const body = document.body;
  const existing = read();

  if (existing) {
    existing.depth += 1;
    return;
  }

  const scrollY = window.scrollY;
  const scrollbarGap = Math.max(0, window.innerWidth - html.clientWidth);

  const state: ScrollLockState = {
    depth: 1,
    scrollY,
    htmlOverflow: html.style.overflow,
    htmlHeight: html.style.height,
    htmlOverscroll: html.style.overscrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    bodyTouchAction: body.style.touchAction,
    bodyPaddingRight: body.style.paddingRight,
  };

  html.style.overflow = "hidden";
  html.style.height = "100%";
  html.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.touchAction = "none";
  if (scrollbarGap > 0) {
    body.style.paddingRight = `${scrollbarGap}px`;
  }

  write(state);
}

export function popBodyScrollLock(): void {
  const state = read();
  if (!state) return;

  state.depth -= 1;
  if (state.depth > 0) return;

  const html = document.documentElement;
  const body = document.body;
  const y = state.scrollY;

  html.style.overflow = state.htmlOverflow;
  html.style.height = state.htmlHeight;
  html.style.overscrollBehavior = state.htmlOverscroll;
  body.style.overflow = state.bodyOverflow;
  body.style.position = state.bodyPosition;
  body.style.top = state.bodyTop;
  body.style.left = state.bodyLeft;
  body.style.right = state.bodyRight;
  body.style.width = state.bodyWidth;
  body.style.touchAction = state.bodyTouchAction;
  body.style.paddingRight = state.bodyPaddingRight;

  write(undefined);
  window.scrollTo(0, y);
}
