'use client';
/**
 * Reliable scroll restoration for Next.js App Router with async client pages.
 *
 * Problem: the browser fires native scroll restoration before useEffect data
 * fetches have run, so the page is shorter than its final height.  The saved
 * pixel offset lands at the bottom of the short loading skeleton; then content
 * loads underneath and the user is stranded at what is now mid-page.
 *
 * Solution:
 *  1. Set history.scrollRestoration = 'manual' so the browser never restores on
 *     its own.
 *  2. Save the outgoing scroll offset the instant the user clicks an internal
 *     link (before Next.js scrolls the new page to 0).
 *  3. On pathname change, watch document.body height with a ResizeObserver and
 *     restore the saved offset once the page is tall enough to accommodate it.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'sbp'; // "scroll by path"

function loadPositions(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function savePosition(path: string, y: number) {
  const map = loadPositions();
  map[path] = Math.round(y);
  // Keep at most 30 entries to avoid sessionStorage bloat
  const keys = Object.keys(map);
  if (keys.length > 30) delete map[keys[0]];
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Quota exceeded — not critical
  }
}

export default function ScrollRestoration() {
  const pathname = usePathname();

  // Hand scroll control to us once on mount
  useEffect(() => {
    history.scrollRestoration = 'manual';
  }, []);

  // Capture scroll position the moment the user clicks an internal link.
  // This fires BEFORE Next.js processes the navigation (and before it calls
  // window.scrollTo(0,0) for the new page), so window.scrollY is still valid.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      // Ignore external links, mailto, tel, and same-page anchors
      if (!href || /^(https?:|mailto:|tel:|#)/.test(href)) return;
      savePosition(pathname, window.scrollY);
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pathname]);

  // Capture scroll position when the user hits the browser back/forward button.
  // At the moment popstate fires the URL has already changed, but window.scrollY
  // still reflects the page that is being left (because scrollRestoration = manual
  // means the browser hasn't reset it yet).  The closed-over `pathname` is still
  // the old path, so this correctly saves the old page's position.
  useEffect(() => {
    const handlePopState = () => savePosition(pathname, window.scrollY);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [pathname]);

  // Save on tab close / page unload
  useEffect(() => {
    const handleHide = () => savePosition(pathname, window.scrollY);
    window.addEventListener('pagehide', handleHide);
    return () => window.removeEventListener('pagehide', handleHide);
  }, [pathname]);

  // Restore scroll when arriving on a page
  useEffect(() => {
    const targetY = loadPositions()[pathname] ?? 0;

    if (targetY === 0) {
      // Fresh visit or already at top — scroll to top immediately
      window.scrollTo(0, 0);
      return;
    }

    // Wait until the document is tall enough to scroll to targetY before
    // restoring.  This handles pages whose content arrives via useEffect fetches.
    let restored = false;

    const tryRestore = () => {
      if (restored) return;
      if (
        document.documentElement.scrollHeight >=
        targetY + window.innerHeight * 0.5
      ) {
        window.scrollTo({ top: targetY, behavior: 'instant' });
        restored = true;
        ro.disconnect();
        clearTimeout(fallback);
      }
    };

    const ro = new ResizeObserver(tryRestore);
    ro.observe(document.body);
    requestAnimationFrame(tryRestore); // attempt immediately after first paint

    // Fallback: if the page never reaches the target height within 2 s (e.g.
    // the user had a very long page last time but now has less data), restore
    // as best we can to avoid being stuck.
    const fallback = setTimeout(() => {
      if (!restored) {
        ro.disconnect();
        window.scrollTo({ top: targetY, behavior: 'instant' });
      }
    }, 2000);

    return () => {
      ro.disconnect();
      clearTimeout(fallback);
    };
  }, [pathname]);

  return null;
}
