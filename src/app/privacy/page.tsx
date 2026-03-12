import Container from "@/app/_components/container";

export const metadata = {
  title: "Privacy Policy | 4 Billion Years On",
  description: "Privacy Policy for 4 Billion Years On.",
};

export default function PrivacyPage() {
  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8">
        <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-800 px-4 md:px-8 py-4 md:py-6">
          <Container>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 text-white font-mono inline-block">
                Privacy Policy
              </h1>
              <div className="prose prose-lg prose-invert max-w-none text-gray-300 space-y-6">
                <p>
                  At <strong>4 Billion Years On</strong>, accessible from 4billionyearson.org, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by us and how we use it.
                </p>
              
              <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Log Files</h2>
              <p>
                4 Billion Years On follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Cookies and Web Beacons</h2>
              <p>
                Like any other website, 4 Billion Years On uses "cookies". These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Google DoubleClick DART Cookie</h2>
              <p>
                Google is one of a third-party vendor on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to our site and other sites on the internet. However, visitors may choose to decline the use of DART cookies by visiting the Google ad and content network Privacy Policy at the following URL – <a href="https://policies.google.com/technologies/ads" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://policies.google.com/technologies/ads</a>
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Advertising Partners Privacy Policies</h2>
              <p>
                Third-party ad servers or ad networks uses technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on 4 Billion Years On, which are sent directly to users' browser. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.
              </p>
              <p>
                Note that 4 Billion Years On has no access to or control over these cookies that are used by third-party advertisers.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Third Party Privacy Policies</h2>
              <p>
                Our Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information.
              </p>
              <p>
                You can choose to disable cookies through your individual browser options. To know more detailed information about cookie management with specific web browsers, it can be found at the browsers' respective websites.
              </p>
            </div>
            </div>
          </Container>
        </div>
      </div>
    </main>
  );
}
