import Container from "@/app/_components/container";

export const metadata = {
  title: "About Us | 4 Billion Years On",
  description: "Learn more about 4 Billion Years On.",
};

export default function AboutPage() {
  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8">
        <div className="bg-[#FFF5E8] rounded-xl shadow-xl min-h-screen px-2 md:px-6 py-4 md:py-6">
          <Container>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 text-gray-900 font-mono inline-block">
                About Us
              </h1>
              <div className="prose prose-lg max-w-none text-gray-800 space-y-6">
                <p>
                  Welcome to <strong>4 Billion Years On</strong>, a platform dedicated to exploring the incredible journey of our universe, our planet, and the technological horizons that lie ahead.
                </p>
                <p>
                  Our mission is to make complex topics—ranging from Artificial Intelligence and Biotechnology to Climate Change and Renewable Energy—accessible, engaging, and thought-provoking. We believe that understanding our past, which stretches back roughly 4 billion years to the dawn of life on Earth, is essential to navigating the challenges and opportunities of our future.
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
