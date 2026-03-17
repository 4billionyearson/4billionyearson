import { Metadata } from "next";
import {
  Dna, Microscope, FlaskConical, Pill, HeartPulse, Leaf,
  ArrowUpRight, BookOpen, ExternalLink, Syringe, Bug,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Biotechnology Explained | 4 Billion Years On",
  description:
    "A plain-English guide to biotechnology: gene editing, CRISPR, mRNA, synthetic biology, and how biotech is reshaping medicine, agriculture, and industry.",
  openGraph: {
    title: "Biotechnology Explained | 4 Billion Years On",
    description:
      "A plain-English guide to biotechnology: gene editing, CRISPR, mRNA, synthetic biology, and how biotech is reshaping medicine, agriculture, and industry.",
  },
};

/* ─── Data ────────────────────────────────────────────────────────────────── */

const GLOSSARY: { term: string; definition: string }[] = [
  { term: "Biotechnology", definition: "The use of living organisms, cells, or biological systems to develop products and technologies. Modern biotech spans medicine (drugs, diagnostics), agriculture (crop engineering), industry (biofuels, materials), and environmental cleanup." },
  { term: "DNA (deoxyribonucleic acid)", definition: "The molecule that carries the genetic instructions for all known living organisms. It consists of two strands twisted into a double helix, with information encoded in sequences of four chemical bases: A, T, C, and G." },
  { term: "RNA (ribonucleic acid)", definition: "A single-stranded molecule that plays multiple roles in biology: carrying genetic instructions from DNA (mRNA), building proteins (rRNA, tRNA), and regulating gene activity. mRNA vaccines work by delivering synthetic RNA instructions to cells." },
  { term: "Gene", definition: "A segment of DNA that contains the instructions for making a specific protein or functional molecule. Humans have roughly 20,000 protein-coding genes, though gene regulation is far more complex than a simple gene-to-protein mapping." },
  { term: "Genome", definition: "The complete set of genetic material in an organism. The human genome contains about 3.2 billion DNA base pairs. The Human Genome Project (completed 2003) first sequenced it; today a whole genome can be sequenced in hours for under $200." },
  { term: "Gene editing", definition: "Technologies that allow scientists to precisely alter DNA sequences in living organisms. Unlike older genetic modification methods, modern gene editing (especially CRISPR) can target specific locations in the genome with high accuracy." },
  { term: "CRISPR-Cas9", definition: "A revolutionary gene-editing tool adapted from a bacterial immune system. CRISPR uses a guide RNA to direct the Cas9 enzyme to a precise DNA location, where it cuts the strand. The cell's repair mechanisms then introduce the desired change. Won the 2020 Nobel Prize in Chemistry." },
  { term: "Base editing", definition: "A newer, more precise form of gene editing that can change individual DNA letters (bases) without cutting both strands of the double helix. This reduces unintended edits and is especially promising for correcting single-letter genetic diseases." },
  { term: "Prime editing", definition: "Often called 'search-and-replace' for DNA – a gene-editing technique that can make virtually any small, targeted change to the genome without double-strand breaks. Developed by David Liu's lab at the Broad Institute." },
  { term: "mRNA technology", definition: "The platform behind the Pfizer-BioNTech and Moderna COVID-19 vaccines. Synthetic mRNA instructs cells to produce a specific protein (e.g. a viral spike protein), triggering an immune response. Now being developed for cancer vaccines, flu, and rare diseases." },
  { term: "Monoclonal antibodies", definition: "Laboratory-made molecules designed to mimic the immune system's ability to target specific proteins. Used to treat cancer, autoimmune diseases, and infections. Drugs like adalimumab (Humira) and trastuzumab (Herceptin) are monoclonal antibodies." },
  { term: "Cell therapy", definition: "Treatments that use living cells as medicine. CAR-T cell therapy, for example, engineers a patient's own immune cells to recognise and attack cancer. Several CAR-T therapies are now approved for blood cancers." },
  { term: "Gene therapy", definition: "Treating disease by introducing, altering, or replacing genetic material within a patient's cells. The first CRISPR-based gene therapy (Casgevy) was approved in 2023 for sickle cell disease and beta-thalassemia." },
  { term: "Synthetic biology", definition: "The design and construction of new biological parts, devices, and systems – or the redesign of existing ones. Synthetic biology aims to make biology easier to engineer, enabling custom organisms that produce drugs, fuels, or materials." },
  { term: "Bioinformatics", definition: "The use of computational tools to analyse biological data – especially DNA sequences, protein structures, and gene expression patterns. Essential for making sense of the massive datasets generated by modern genomics." },
  { term: "Genomics", definition: "The study of entire genomes – all the DNA in an organism. Advances in genomics have enabled personalised medicine, where treatments are tailored to an individual's genetic profile." },
  { term: "Proteomics", definition: "The large-scale study of proteins – their structures, functions, and interactions. AlphaFold (DeepMind) has predicted the 3D structure of virtually every known protein, a major breakthrough for drug discovery." },
  { term: "Protein folding", definition: "Proteins fold into specific 3D shapes that determine their function. Misfolded proteins cause diseases like Alzheimer's and Parkinson's. AI tools like AlphaFold have largely solved the protein structure prediction problem." },
  { term: "Drug discovery", definition: "The process of identifying and developing new medicines. Traditionally takes 10-15 years and costs $1-2 billion per drug. AI and biotech tools are aiming to compress timelines and reduce costs dramatically." },
  { term: "Clinical trials", definition: "The phased testing of new treatments in humans: Phase I (safety, small group), Phase II (efficacy, larger group), Phase III (large-scale comparison with existing treatments). Only ~10% of drugs entering Phase I eventually reach patients." },
  { term: "Biomarker", definition: "A measurable biological indicator – a molecule, gene, or characteristic – that signals normal or diseased processes. Biomarkers enable earlier diagnosis, better patient selection for clinical trials, and personalised treatment decisions." },
  { term: "GMO (genetically modified organism)", definition: "An organism whose DNA has been altered using genetic engineering. GMO crops (resistant to pests or drought) are widespread in agriculture. Newer gene-editing techniques like CRISPR offer more precise modifications than earlier GMO methods." },
  { term: "Microbiome", definition: "The community of trillions of microorganisms living in and on the human body (especially the gut). Research is revealing links between the microbiome and conditions from obesity to depression, opening new therapeutic avenues." },
  { term: "Biologics", definition: "Medicines made from living cells or organisms, as opposed to traditional chemical drugs. Includes monoclonal antibodies, vaccines, cell therapies, and gene therapies. Biologics are the fastest-growing segment of the pharmaceutical market." },
  { term: "Biosimilar", definition: "A biological medicine highly similar to an already approved biologic (like a generic for biologics). Biosimilars increase competition and reduce costs, but are more complex to manufacture than generic chemical drugs." },
];

const KEY_FACTS: { icon: React.ReactNode; text: string }[] = [
  { icon: <Dna className="h-5 w-5 text-fuchsia-400 flex-shrink-0" />, text: "The first CRISPR gene therapy (Casgevy) was approved in 2023, curing sickle cell disease by editing patients' own cells – a landmark for genetic medicine." },
  { icon: <Syringe className="h-5 w-5 text-blue-400 flex-shrink-0" />, text: "mRNA vaccines were developed in under a year for COVID-19. The same platform is now in trials for cancer, flu, RSV, and rare genetic diseases." },
  { icon: <Microscope className="h-5 w-5 text-cyan-400 flex-shrink-0" />, text: "Whole human genome sequencing now costs under $200 and takes hours – down from $2.7 billion and 13 years for the first sequence (2003)." },
  { icon: <FlaskConical className="h-5 w-5 text-emerald-400 flex-shrink-0" />, text: "AlphaFold (DeepMind) has predicted the 3D structure of over 200 million proteins – virtually every known protein – accelerating drug discovery worldwide." },
  { icon: <Pill className="h-5 w-5 text-amber-400 flex-shrink-0" />, text: "GLP-1 receptor agonists (like semaglutide) are transforming the treatment of obesity and diabetes, with potential benefits for heart disease, addiction, and neurodegeneration." },
  { icon: <HeartPulse className="h-5 w-5 text-red-400 flex-shrink-0" />, text: "CAR-T cell therapy has achieved complete remission in some patients with previously untreatable blood cancers, with efforts underway to extend it to solid tumours." },
  { icon: <Leaf className="h-5 w-5 text-green-400 flex-shrink-0" />, text: "Synthetic biology enables microbes to produce spider silk, sustainable aviation fuel, and lab-grown meat proteins – potentially replacing polluting industrial processes." },
  { icon: <Bug className="h-5 w-5 text-orange-400 flex-shrink-0" />, text: "Antimicrobial resistance is a growing global threat. Biotech approaches – phage therapy, AI-designed antibiotics, rapid diagnostics – may help tackle superbugs." },
];

const RESOURCES: { name: string; url: string; desc: string }[] = [
  { name: "Nature Biotechnology", url: "https://www.nature.com/nbt/", desc: "Leading peer-reviewed journal covering the latest biotech research and commercial developments." },
  { name: "STAT News", url: "https://www.statnews.com/", desc: "In-depth reporting on health, medicine, and the life sciences – essential reading for biotech news." },
  { name: "Our World in Data – Health", url: "https://ourworldindata.org/health-meta", desc: "Data-driven articles on global health, disease burden, and medical progress." },
  { name: "Broad Institute", url: "https://www.broadinstitute.org/", desc: "A leading genomics research centre (MIT/Harvard). Home to key CRISPR, base editing, and prime editing advances." },
  { name: "NIH – What is Genomics?", url: "https://www.genome.gov/about-genomics", desc: "The US National Institutes of Health's accessible introduction to genomics and genetic research." },
  { name: "EMA – Advanced Therapies", url: "https://www.ema.europa.eu/en/human-regulatory-overview/advanced-therapies-overview", desc: "The European Medicines Agency's guide to gene therapies, cell therapies, and tissue-engineered products." },
  { name: "WHO – Gene Editing Governance", url: "https://www.who.int/publications/i/item/9789240030381", desc: "The World Health Organization's framework for governance of human genome editing." },
  { name: "BioPharma Dive", url: "https://www.biopharmadive.com/", desc: "Business-focused reporting on biotech and pharma – deals, clinical trial results, and industry trends." },
];

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function BiotechExplainedPage() {
  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Hero */}
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#FFF5E7] overflow-hidden">
            <div className="px-5 py-4 md:px-6 md:py-5" style={{ backgroundColor: '#FFF5E7' }}>
              <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow-sm font-mono tracking-tight text-[#D26742]">Biotechnology</h1>
              <div className="flex items-center gap-2 mt-3">
                <BookOpen className="h-5 w-5 text-[#D26742]/80" />
                <p className="text-sm uppercase tracking-[0.3em] text-[#D26742]/80 font-mono">Explainer</p>
              </div>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md px-5 py-4 md:px-6 md:py-5">
              <p className="text-sm md:text-lg font-medium max-w-3xl text-gray-300">
                A plain-English guide to biotech – gene editing, mRNA, synthetic biology, and how biological science is transforming medicine, agriculture, and industry.
              </p>
            </div>
          </div>

          {/* Key facts */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#FFF5E7]">
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

          {/* How biotech works */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#FFF5E7]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-5">How Modern Biotech Works</h2>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                Biology is becoming an engineering discipline. For most of history, we could only observe living systems; now we can read, write, and edit the code of life – <strong className="text-white">DNA</strong> – with increasing precision.
              </p>
              <p>
                <strong className="text-white">Genomics</strong> made it possible to read: the Human Genome Project (2003) sequenced all 3.2 billion letters of human DNA. Today, sequencing is ~15 million times cheaper and millions of genomes have been read, revealing the genetic basis of thousands of diseases.
              </p>
              <p>
                <strong className="text-white">Gene editing</strong> – especially CRISPR-Cas9, discovered in 2012 – made it possible to write and edit. CRISPR works like molecular scissors: a guide RNA directs the Cas9 enzyme to a precise location in the genome, where it cuts the DNA. The cell&apos;s natural repair machinery then introduces the desired change. Newer tools (base editing, prime editing) are even more precise.
              </p>
              <p>
                <strong className="text-white">mRNA technology</strong> proved its power during the pandemic: synthetic messenger RNA instructs human cells to produce a target protein (like a viral spike protein), training the immune system to fight the real virus. The same platform is now being adapted for personalised cancer vaccines, where mRNA is designed to match the unique mutations in a patient&apos;s tumour.
              </p>
              <p>
                Meanwhile, <strong className="text-white">synthetic biology</strong> is engineering entirely new biological systems. Custom-designed microorganisms can produce medicines, sustainable fuels, and novel materials. And <strong className="text-white">AI is accelerating it all</strong> – tools like AlphaFold predict protein structures in seconds (a problem that took PhD students years), while machine learning models design new drug candidates faster than any human team.
              </p>
            </div>
          </section>

          {/* Frontiers */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#FFF5E7]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-5">Biotech Frontiers in 2025–26</h2>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                Biotechnology is advancing on multiple fronts simultaneously. Key areas to watch:
              </p>
              <div className="grid gap-3">
                {[
                  { title: "CRISPR therapies go mainstream", desc: "Following the approval of Casgevy (2023) for sickle cell disease, dozens of gene-editing therapies are now in clinical trials for conditions from inherited blindness to high cholesterol." },
                  { title: "Personalised cancer vaccines", desc: "mRNA vaccines tailored to an individual's tumour mutations are showing promising results in melanoma and pancreatic cancer trials. Moderna and BioNTech are leading this effort." },
                  { title: "GLP-1 revolution", desc: "Semaglutide (Ozempic/Wegovy) and tirzepatide (Mounjaro) are transforming obesity treatment and showing unexpected benefits for heart disease, kidney disease, and potentially addiction and neurodegeneration." },
                  { title: "AI-driven drug discovery", desc: "Companies like Isomorphic Labs, Recursion, and Insilico Medicine are using AI to design and test drug candidates, with several AI-discovered drugs now in clinical trials." },
                  { title: "Epigenetic editing", desc: "New tools that modify gene expression without changing the underlying DNA sequence – potentially offering reversible gene therapy and treatments for diseases of ageing." },
                  { title: "Xenotransplantation", desc: "Genetically modified pig organs have been transplanted into human patients for the first time, offering hope for the severe shortage of donor organs." },
                ].map(({ title, desc }) => (
                  <div key={title} className="bg-gray-900/60 rounded-xl p-3.5 border border-gray-700/40">
                    <p className="text-sm font-semibold text-[#FFF5E7] mb-1">{title}</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Glossary */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#FFF5E7]">
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
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#FFF5E7]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-5">Explore Biotech Content</h2>
            <p className="text-sm text-gray-400 mb-4">Read our latest analysis and reporting on biotechnology:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { href: "/category/biotechnology", label: "Biotech Blog", color: "text-[#D26742]", desc: "Articles on biotech breakthroughs, drug development & analysis" },
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
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#FFF5E7]">
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
                  <ExternalLink className="h-4 w-4 text-[#FFF5E7] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#FFF5E7] transition-colors">{name}</p>
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
