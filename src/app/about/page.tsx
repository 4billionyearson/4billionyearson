import Container from "@/app/_components/container";

export const metadata = {
  title: "About | 4 Billion Years On",
  description: "4 Billion Years On is a data journalism platform tracking four civilisation-scale shifts — AI, climate change, renewable energy, and biotechnology — in one place. Real-time dashboards, plain-English explainers, curated books, and sourced articles for curious non-experts.",
  openGraph: {
    title: "About | 4 Billion Years On",
    description: "4 Billion Years On is a data journalism platform tracking four civilisation-scale shifts — AI, climate change, renewable energy, and biotechnology — in one place.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "About | 4 Billion Years On",
    description: "A living dashboard for the forces reshaping the world, explained simply.",
    images: ['/Category%20image%20for%20social%20media%20links.png'],
  },
};

export default function AboutPage() {
  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8">
        <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-800 px-4 md:px-8 py-4 md:py-6">
          <Container>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 text-white font-mono inline-block">
                About Us
              </h1>
              <div className="prose prose-lg prose-invert max-w-none text-gray-300 space-y-6">
                <p>
                  Welcome to <strong>4 Billion Years On</strong>, a platform dedicated to exploring the incredible journey of our universe, our planet, and the technological horizons that lie ahead.
                </p>
                <p>
                  Our mission is to make complex topics–ranging from Artificial Intelligence and Biotechnology to Climate Change and Renewable Energy–accessible, engaging, and thought-provoking. We believe that understanding our past, which stretches back roughly 4 billion years to the dawn of life on Earth, is essential to navigating the challenges and opportunities of our future.
                </p>
                <p>
                  Whether we are dissecting the latest breakthroughs in AI, examining sustainable solutions to protect our global ecosystems, or marveling at the sheer resilience of life, our goal is to inspire curiosity.
                </p>
                <p>
                  Thank you for joining us on this journey. If you have any questions, suggestions, or just want to discuss the cosmos, feel free to reach out to us at <a href="mailto:chris.4billionyears@gmail.com" className="text-blue-600 hover:underline">chris.4billionyears@gmail.com</a>.
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>
    </main>
  );
}
