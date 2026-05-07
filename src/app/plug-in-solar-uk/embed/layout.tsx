'use client';

import { useEffect } from 'react';

/**
 * Lightweight wrapper for embeddable widgets - drops the full site
 * chrome (header / footer) and gives an opaque dark background suitable
 * for iframe embedding on third-party sites.
 */
export default function PlugInSolarEmbedLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-embed', 'true');
    return () => document.documentElement.removeAttribute('data-embed');
  }, []);

  return <div className="bg-gray-950 text-gray-200 font-sans">{children}</div>;
}
