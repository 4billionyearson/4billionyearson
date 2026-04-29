'use client';

import { useEffect } from 'react';

export default function EnsoEmbedLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-embed', 'true');
    return () => document.documentElement.removeAttribute('data-embed');
  }, []);

  return (
    <div className="bg-gray-950 text-gray-200 font-sans">
      {children}
    </div>
  );
}
