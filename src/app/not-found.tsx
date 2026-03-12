import Link from "next/link";
import Container from "@/app/_components/container";

export default function NotFound() {
  return (
    <main className="flex-grow flex items-center justify-center py-20 px-4">
      <Container>
        <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-800 py-16 px-6 md:px-12 text-center max-w-2xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-black font-mono mb-4 text-white">404</h1>
          <h2 className="text-2xl md:text-3xl font-bold font-mono mb-6 pb-4 border-b border-gray-700 text-gray-300">Page Not Found</h2>
          <p className="text-lg text-gray-400 mb-8 font-serif leading-relaxed">
            The link you followed might be broken, or the page may have been removed. We have 4 billion years of history, but the page you are looking for isn't part of it!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/"
              className="bg-white text-black font-mono font-bold py-3 px-8 rounded-lg hover:bg-gray-200 transition-colors shadow-md w-full sm:w-auto"
            >
              Back to Earth (Home)
            </Link>
            <Link 
              href="/search"
              className="bg-transparent text-gray-300 border-2 border-gray-600 font-mono font-bold py-3 px-8 rounded-lg hover:bg-gray-800 hover:text-white transition-colors shadow-md w-full sm:w-auto"
            >
              Search the Archives
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
