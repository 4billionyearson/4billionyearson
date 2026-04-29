export default function EnsoEmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-950 text-gray-200 min-h-screen font-sans">
      {children}
    </div>
  );
}
