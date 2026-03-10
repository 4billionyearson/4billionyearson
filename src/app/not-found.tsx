import Link from "next/link";
import Container from "@/app/_components/container";

export default function NotFound() {
  return (
    <main className="flex-grow flex items-center justify-center py-20 px-4">
      <Container>
        <div className="bg-[#FFF5E8] rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.35)] py-16 px-6 md:px-12 text-center max-w-2xl mx-auto border-t-[6px] border-black">
          <h1 className="text-6xl md:text-8xl font-black font-mono mb-4 text-black">404</h1>
          <h2 className="text-2xl md:text-3xl font-bold font-mono mb-6 pb-4 border-b border-gray-300">Page Not Found</h2>
          <p className="text-lg text-gray-700 mb-8 font-serif leading-relaxed">
            The link you followed might be broken, or the page may have been removed. We have 4 billion years of history, but the page you are looking for isn't part of it!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/"
              className="bg-black text-white font-mono font-bold py-3 px-8 rounded-lg hover:bg-gray-800 transition-colors shadow-md w-full sm:w-auto"
            >
              Back to Earth (Home)
            </Link>
            <Link 
              href="/search"
              className="bg-transparent text-black border-2 border-black font-mono font-bold py-3 px-8 rounded-lg hover:bg-black hover:text-white transition-colors shadow-md w-full sm:w-auto"
            >
              Search the Archives
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
