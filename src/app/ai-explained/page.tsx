import { Metadata } from "next";
import {
  Brain, Cpu, Bot, Eye, MessageSquare, Shield, Scale,
  ArrowUpRight, BookOpen, ExternalLink, Sparkles, CircuitBoard,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AI Explained | 4 Billion Years On",
  description:
    "A plain-English guide to artificial intelligence: machine learning, large language models, neural networks, AI safety, and what the technology really means.",
  openGraph: {
    title: "AI Explained | 4 Billion Years On",
    description:
      "A plain-English guide to artificial intelligence: machine learning, large language models, neural networks, AI safety, and what the technology really means.",
  },
};

/* ─── Data ────────────────────────────────────────────────────────────────── */

const GLOSSARY: { term: string; definition: string }[] = [
  { term: "Artificial intelligence (AI)", definition: "The broad field of computer science focused on creating systems that can perform tasks typically requiring human intelligence – recognising images, understanding language, making decisions, and generating content." },
  { term: "Machine learning (ML)", definition: "A subset of AI where systems learn patterns from data rather than being explicitly programmed. Instead of writing rules by hand, you feed examples and the algorithm finds the rules itself." },
  { term: "Deep learning", definition: "A subset of machine learning that uses artificial neural networks with many layers. Deep learning drives most modern AI breakthroughs – from image recognition to language models." },
  { term: "Neural network", definition: "A computing architecture loosely inspired by the brain, consisting of layers of interconnected nodes (neurons) that process information. Each connection has a weight that adjusts during training." },
  { term: "Large language model (LLM)", definition: "A neural network trained on vast amounts of text to predict and generate language. Examples include GPT-4, Claude, Gemini, and Llama. LLMs power chatbots, coding assistants, and content generation tools." },
  { term: "Transformer", definition: "The neural network architecture behind modern LLMs, introduced in 2017. Transformers use an 'attention mechanism' that lets the model weigh the relevance of every word in a sequence against every other word, enabling much better understanding of context." },
  { term: "Training", definition: "The process of feeding data to a model so it can learn patterns. Training large models requires enormous compute power – GPT-4-class models are estimated to cost over $100 million to train." },
  { term: "Inference", definition: "Using a trained model to make predictions or generate output. When you ask ChatGPT a question, that's inference. It's much cheaper than training but still requires significant compute at scale." },
  { term: "Parameters", definition: "The internal variables (weights) a model adjusts during training. GPT-4 is estimated to have over 1 trillion parameters. More parameters generally means greater capability but also higher cost." },
  { term: "Fine-tuning", definition: "Taking a pre-trained model and further training it on a specific dataset to specialise its behaviour – for example, training a general LLM on medical literature to create a healthcare assistant." },
  { term: "Prompt engineering", definition: "The practice of crafting input text (prompts) to get better outputs from AI models. Small changes in phrasing can dramatically alter responses." },
  { term: "Retrieval-augmented generation (RAG)", definition: "A technique where an LLM is given access to external documents or databases at query time, so it can base answers on up-to-date, specific information rather than relying solely on training data." },
  { term: "Hallucination", definition: "When an AI model generates plausible-sounding but factually incorrect information. LLMs predict likely text – they don't 'know' facts – so they can confidently state things that are wrong." },
  { term: "Foundation model", definition: "A large model trained on broad data that can be adapted for many downstream tasks. GPT-4, Claude, and Gemini are foundation models – they weren't built for one purpose but can be applied to many." },
  { term: "Multimodal AI", definition: "Models that can process and generate multiple types of data – text, images, audio, video. GPT-4o and Gemini are multimodal, able to 'see' images and 'hear' audio alongside text." },
  { term: "Generative AI", definition: "AI systems that create new content – text, images, music, code, video. Distinguished from 'analytical' AI that classifies or predicts. DALL-E, Midjourney, and Sora are generative AI tools." },
  { term: "Artificial general intelligence (AGI)", definition: "A hypothetical AI system that matches or exceeds human cognitive ability across all domains. Current AI is 'narrow' – excellent at specific tasks but lacking general reasoning. AGI timelines are hotly debated." },
  { term: "AI alignment", definition: "The challenge of ensuring AI systems pursue goals that are beneficial to humans. As models become more capable, ensuring they remain safe, honest, and controllable becomes increasingly critical." },
  { term: "Reinforcement learning from human feedback (RLHF)", definition: "A training technique where human evaluators rank model outputs and the model learns to prefer responses humans rate highly. Used to make LLMs more helpful, harmless, and honest." },
  { term: "AI agent", definition: "An AI system that can take autonomous actions – browsing the web, writing and running code, calling APIs – to accomplish goals with minimal human intervention. A major frontier in 2025–26." },
  { term: "Compute", definition: "The processing power required to train and run AI models, typically measured in GPU-hours or FLOPS. Access to compute is a key bottleneck and competitive advantage in AI development." },
  { term: "GPU (graphics processing unit)", definition: "Originally designed for rendering graphics, GPUs are now the primary hardware for training neural networks because they excel at the parallel matrix calculations AI requires. NVIDIA dominates this market." },
  { term: "Open-source vs closed-source AI", definition: "Open-source models (Llama, Mistral) release their weights publicly, allowing anyone to run and modify them. Closed-source models (GPT-4, Claude) are accessible only via APIs. The debate over which approach is safer and more beneficial is ongoing." },
  { term: "Tokens", definition: "The basic units LLMs process – roughly ¾ of a word in English. Model pricing, context windows, and speed are all measured in tokens. GPT-4 Turbo has a 128K-token context window." },
  { term: "Benchmark", definition: "A standardised test used to measure AI capabilities – e.g. MMLU (broad knowledge), HumanEval (coding), ARC (reasoning). Models are compared by their benchmark scores, though real-world performance often differs." },
];

const KEY_FACTS: { icon: React.ReactNode; text: string }[] = [
  { icon: <Brain className="h-5 w-5 text-violet-400 flex-shrink-0" />, text: "ChatGPT reached 100 million users in two months after launch (Jan 2023) – the fastest adoption of any consumer application in history." },
  { icon: <Cpu className="h-5 w-5 text-cyan-400 flex-shrink-0" />, text: "AI training compute is doubling roughly every 6 months. The compute used for frontier models has increased ~10 billion-fold since 2010." },
  { icon: <Sparkles className="h-5 w-5 text-amber-400 flex-shrink-0" />, text: "Global investment in AI reached over $200 billion in 2025, with the US accounting for roughly two-thirds of venture funding." },
  { icon: <MessageSquare className="h-5 w-5 text-emerald-400 flex-shrink-0" />, text: "LLMs can now pass the bar exam, medical licensing exams, and graduate-level science tests – often scoring in the top percentiles." },
  { icon: <Eye className="h-5 w-5 text-blue-400 flex-shrink-0" />, text: "AI systems can now generate photorealistic images, fluent text, working code, and even short videos from text descriptions alone." },
  { icon: <Shield className="h-5 w-5 text-red-400 flex-shrink-0" />, text: "Over 50 countries have introduced or proposed AI regulation. The EU AI Act (2024) is the world's first comprehensive AI law." },
  { icon: <Bot className="h-5 w-5 text-orange-400 flex-shrink-0" />, text: "AI agents that can autonomously browse the web, write code, and complete multi-step tasks are rapidly advancing in 2025–26." },
  { icon: <Scale className="h-5 w-5 text-gray-400 flex-shrink-0" />, text: "An estimated 300 million jobs could be affected by generative AI, though many new roles are also being created." },
];

const RESOURCES: { name: string; url: string; desc: string }[] = [
  { name: "Stanford HAI – AI Index Report", url: "https://aiindex.stanford.edu/report/", desc: "The most comprehensive annual report on AI trends: research, investment, policy, and public opinion." },
  { name: "Our World in Data – AI", url: "https://ourworldindata.org/artificial-intelligence", desc: "Data-driven articles and charts on AI capabilities, adoption, and societal impact." },
  { name: "MIT Technology Review – AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/", desc: "In-depth reporting on the latest AI developments, from research breakthroughs to real-world applications." },
  { name: "Epoch AI", url: "https://epochai.org/", desc: "Research on AI compute trends, model scaling, and forecasting when AI milestones will be reached." },
  { name: "AI Safety Institute (UK)", url: "https://www.aisi.gov.uk/", desc: "The UK government body evaluating frontier AI models for safety risks." },
  { name: "NIST AI Risk Management", url: "https://www.nist.gov/artificial-intelligence", desc: "The US National Institute of Standards and Technology's framework for managing AI risks." },
  { name: "Anthropic Research", url: "https://www.anthropic.com/research", desc: "Safety-focused AI research from the makers of Claude, including work on alignment and interpretability." },
  { name: "DeepMind Research", url: "https://deepmind.google/research/", desc: "Cutting-edge AI research from Google DeepMind, spanning science, reasoning, and safety." },
  { name: "Data Center Map", url: "https://www.datacentermap.com/", desc: "Global directory and map of 11,000+ data centers across 174 countries — colocation, cloud, and edge facilities." },
];

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function AIExplainedPage() {
  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Hero */}
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#88DDFC] overflow-hidden">
            <div className="px-5 py-4 md:px-6 md:py-5" style={{ backgroundColor: '#88DDFC' }}>
              <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow-sm font-mono tracking-tight text-[#FFF5E7]">Artificial Intelligence</h1>
              <div className="flex items-center gap-2 mt-3">
                <BookOpen className="h-5 w-5 text-[#FFF5E7]/80" />
                <p className="text-sm uppercase tracking-[0.3em] text-[#FFF5E7]/80 font-mono">Explainer</p>
              </div>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md px-5 py-4 md:px-6 md:py-5">
              <p className="text-sm md:text-lg font-medium max-w-3xl text-gray-300">
                A plain-English guide to AI – how it works, what the key concepts mean, and why it matters. No hype, no jargon – just the essentials.
              </p>
            </div>
          </div>

          {/* Key facts */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#88DDFC]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-5">Key Facts</h2>
            <div className="grid gap-3">
              {KEY_FACTS.map(({ icon, text }, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-900/60 rounded-xl p-3.5 border border-gray-700/40">
                  {icon}
                  <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How AI works */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#88DDFC]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-5">How Modern AI Works</h2>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                At its core, modern AI is <strong className="text-white">pattern recognition at scale</strong>. A neural network is shown billions of examples – text, images, or other data – and learns the statistical patterns within them. It doesn&apos;t &quot;understand&quot; in the human sense; it builds an extraordinarily sophisticated model of what typically follows what.
              </p>
              <p>
                <strong className="text-white">Large language models</strong> (LLMs) like GPT-4, Claude, and Gemini are trained by reading trillions of words from the internet, books, and code. They learn to predict the next word in a sequence – but this simple objective, at sufficient scale, produces systems that can write essays, solve maths problems, generate code, and engage in nuanced conversation.
              </p>
              <p>
                The <strong className="text-white">transformer architecture</strong> (introduced in 2017) made this possible. Its &quot;attention mechanism&quot; lets the model consider the relationship between every word and every other word in a passage simultaneously, capturing context far better than earlier approaches. Virtually all frontier AI models today are based on transformers.
              </p>
              <p>
                Training these models requires immense <strong className="text-white">compute</strong> – thousands of specialised GPUs running for months, consuming megawatts of electricity. This has created a concentration of AI capability among a handful of well-funded labs (OpenAI, Google DeepMind, Anthropic, Meta, xAI) and a growing debate about the environmental and economic costs.
              </p>
              <p>
                Once trained, models are made safer through <strong className="text-white">reinforcement learning from human feedback</strong> (RLHF) – human evaluators rate responses, and the model learns to prefer answers humans find helpful, accurate, and harmless. This is an active area of research, because aligning increasingly capable systems with human values becomes harder as capabilities grow.
              </p>
            </div>
          </section>

          {/* The AI landscape */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#88DDFC]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-5">The AI Landscape in 2025–26</h2>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                AI development is moving at an unprecedented pace. Key trends shaping the field right now:
              </p>
              <div className="grid gap-3">
                {[
                  { title: "AI Agents", desc: "Systems that can autonomously plan, use tools, browse the web, write code, and complete multi-step tasks are the defining frontier. Companies are racing to build agents that act reliably on behalf of users." },
                  { title: "Multimodal models", desc: "Frontier models now process text, images, audio, and video natively. This enables applications from visual question-answering to real-time voice assistants." },
                  { title: "Reasoning models", desc: "A new class of models (like OpenAI's o-series and DeepSeek-R1) that 'think step by step' before answering, dramatically improving performance on maths, science, and complex logic tasks." },
                  { title: "Open-source surge", desc: "Meta's Llama, Mistral, and DeepSeek have demonstrated that open-weight models can rival proprietary ones, democratising access but also raising safety questions." },
                  { title: "AI regulation", desc: "The EU AI Act, US executive orders, and UK AI Safety Institute mark the beginning of serious AI governance. Balancing innovation with safety is the central policy challenge." },
                  { title: "Scaling debate", desc: "Whether simply making models bigger continues to improve them ('scaling laws') or whether new architectures are needed is one of the biggest open questions in the field." },
                ].map(({ title, desc }) => (
                  <div key={title} className="bg-gray-900/60 rounded-xl p-3.5 border border-gray-700/40">
                    <p className="text-sm font-semibold text-[#88DDFC] mb-1">{title}</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Glossary */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#88DDFC]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-5">Glossary</h2>
            <div className="divide-y divide-gray-800/60">
              {GLOSSARY.map(({ term, definition }) => (
                <div key={term} className="py-3 first:pt-0 last:pb-0">
                  <dt className="font-semibold text-white text-sm mb-0.5">{term}</dt>
                  <dd className="text-sm text-gray-400 leading-relaxed">{definition}</dd>
                </div>
              ))}
            </div>
          </section>

          {/* Explore */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#88DDFC]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-5">Explore AI Content</h2>
            <p className="text-sm text-gray-400 mb-4">Read our latest analysis and reporting on artificial intelligence:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { href: "/category/artificial-intelligence", label: "AI Blog", color: "text-[#89DEFD]", desc: "Articles on AI trends, breakthroughs & analysis" },
              ].map(({ href, label, color, desc }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-3.5 border border-gray-700/40 hover:border-gray-600 transition-colors group"
                >
                  <ArrowUpRight className={`h-4 w-4 ${color} flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`} />
                  <div>
                    <p className={`text-sm font-semibold ${color}`}>{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Further reading */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#88DDFC]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-5">Further Reading</h2>
            <div className="grid gap-3">
              {RESOURCES.map(({ name, url, desc }) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 bg-gray-900/60 rounded-xl p-3.5 border border-gray-700/40 hover:border-gray-600 transition-colors group"
                >
                  <ExternalLink className="h-4 w-4 text-[#88DDFC] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#88DDFC] transition-colors">{name}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
