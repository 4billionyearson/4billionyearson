import { Metadata } from "next";
import {
  Thermometer, Wind, Droplets, Mountain, Snowflake, Flame,
  ArrowUpRight, Globe, TreePine, AlertTriangle, BookOpen, ExternalLink,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Climate Change Explained | 4 Billion Years On",
  description:
    "A plain-English guide to climate change: greenhouse gases, global warming, feedback loops, tipping points, and what the science really says.",
  openGraph: {
    title: "Climate Change Explained | 4 Billion Years On",
    description:
      "A plain-English guide to climate change: greenhouse gases, global warming, feedback loops, tipping points, and what the science really says.",
  },
};

/* ─── Data ────────────────────────────────────────────────────────────────── */

const GLOSSARY: { term: string; definition: string }[] = [
  { term: "Greenhouse effect", definition: "Certain gases in Earth's atmosphere trap heat from the sun, keeping the planet warm enough to support life. Without it, average surface temperature would be about −18 °C instead of +15 °C." },
  { term: "CO₂ (carbon dioxide)", definition: "The most significant long-lived greenhouse gas emitted by human activity, primarily from burning fossil fuels. Atmospheric concentration has risen from ~280 ppm (pre-industrial) to over 420 ppm today." },
  { term: "Methane (CH₄)", definition: "A potent greenhouse gas with roughly 80× the warming power of CO₂ over 20 years. Major sources include livestock, rice paddies, landfills, and fossil-fuel extraction." },
  { term: "Nitrous oxide (N₂O)", definition: "A long-lived greenhouse gas roughly 270× more warming than CO₂ per molecule. Mainly released from agricultural fertilisers & industrial processes." },
  { term: "Global warming", definition: "The long-term increase in Earth's average surface temperature, driven primarily by rising greenhouse gas concentrations. The planet has warmed approximately 1.2 °C since the late 1800s." },
  { term: "Climate change", definition: "Broader than warming alone – encompasses shifts in weather patterns, sea levels, ice coverage, ocean chemistry, and ecosystems caused by the energy imbalance from greenhouse gases." },
  { term: "Feedback loop", definition: "A process where warming triggers further warming (positive feedback) or counteracts it (negative feedback). Example: melting ice exposes darker ocean, which absorbs more heat, melting more ice." },
  { term: "Tipping point", definition: "A threshold beyond which a change becomes self-reinforcing and potentially irreversible. Examples include collapse of the West Antarctic Ice Sheet, Amazon rainforest dieback, and permafrost thaw." },
  { term: "Carbon budget", definition: "The total amount of CO₂ humanity can still emit while keeping warming below a given target (e.g. 1.5 °C). Current estimates suggest the 1.5 °C budget may be exhausted within this decade." },
  { term: "Net zero", definition: "The point at which greenhouse gas emissions released equal those removed from the atmosphere, through natural sinks or technology. Most climate targets aim for global net zero by 2050." },
  { term: "Paris Agreement", definition: "A 2015 international treaty where 196 parties agreed to limit warming to well below 2 °C, preferably 1.5 °C, above pre-industrial levels." },
  { term: "IPCC", definition: "The Intergovernmental Panel on Climate Change – a UN body that synthesises the latest climate science. Its Assessment Reports (AR6 is the latest) are considered the gold standard." },
  { term: "Carbon intensity", definition: "The amount of CO₂ emitted per unit of energy produced or GDP generated. A falling carbon intensity means cleaner energy or more efficient economies." },
  { term: "Albedo", definition: "The reflectivity of a surface. Ice and snow have high albedo (reflect sunlight); oceans and forests have low albedo (absorb more heat)." },
  { term: "Radiative forcing", definition: "The difference between incoming solar energy and outgoing energy radiated back to space. Positive forcing (from greenhouse gases) warms the planet." },
  { term: "ppm / ppb", definition: "Parts per million / billion – units used to measure trace gas concentrations in the atmosphere. CO₂ is measured in ppm; methane in ppb." },
  { term: "Planetary boundaries", definition: "A framework identifying nine Earth-system processes (e.g. climate change, biodiversity loss) with safe limits. Crossing them risks abrupt or irreversible environmental change." },
];

const KEY_FACTS: { icon: React.ReactNode; text: string }[] = [
  { icon: <Thermometer className="h-5 w-5 text-red-400 flex-shrink-0" />, text: "Earth has warmed ~1.2 °C since pre-industrial times. The last decade was the hottest on record." },
  { icon: <Wind className="h-5 w-5 text-amber-400 flex-shrink-0" />, text: "CO₂ levels are higher than at any point in at least 800,000 years – and rising faster than ever." },
  { icon: <Droplets className="h-5 w-5 text-blue-400 flex-shrink-0" />, text: "Global sea levels have risen ~21 cm since 1900 and the rate is accelerating – now ~4.5 mm/year." },
  { icon: <Snowflake className="h-5 w-5 text-teal-400 flex-shrink-0" />, text: "Arctic summer sea-ice extent has declined ~13% per decade since satellite records began in 1979." },
  { icon: <Flame className="h-5 w-5 text-orange-400 flex-shrink-0" />, text: "Extreme weather events – heatwaves, floods, droughts – are becoming more frequent and intense." },
  { icon: <Mountain className="h-5 w-5 text-gray-400 flex-shrink-0" />, text: "Glaciers worldwide are losing ~270 billion tonnes of ice per year, contributing to sea-level rise." },
  { icon: <TreePine className="h-5 w-5 text-emerald-400 flex-shrink-0" />, text: "Roughly 1 million species face extinction risk, many driven by climate-related habitat loss." },
  { icon: <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />, text: "At 1.5 °C of warming, coral reefs decline by 70-90%. At 2 °C, virtually all are lost." },
];

const RESOURCES: { name: string; url: string; desc: string }[] = [
  { name: "IPCC Sixth Assessment Report", url: "https://www.ipcc.ch/assessment-report/ar6/", desc: "The most comprehensive summary of climate science available." },
  { name: "NASA Climate", url: "https://climate.nasa.gov/", desc: "Real-time climate data, visualisations, and educational resources." },
  { name: "Carbon Brief", url: "https://www.carbonbrief.org/", desc: "Clear, data-driven journalism covering the latest climate science and policy." },
  { name: "Met Office Climate Guide", url: "https://www.metoffice.gov.uk/weather/climate-change/what-is-climate-change", desc: "Plain-English explainers from the UK's national weather service." },
  { name: "Our World in Data – CO₂ & GHGs", url: "https://ourworldindata.org/co2-and-greenhouse-gas-emissions", desc: "Interactive charts and data on global & country-level emissions." },
  { name: "Climate Action Tracker", url: "https://climateactiontracker.org/", desc: "Independent analysis of government climate pledges vs actual action." },
  { name: "Stockholm Resilience Centre", url: "https://www.stockholmresilience.org/research/planetary-boundaries.html", desc: "Research on the nine planetary boundaries framework." },
  { name: "Global Carbon Project", url: "https://www.globalcarbonproject.org/", desc: "Annual carbon budgets and emissions datasets used by the IPCC." },
];

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function ClimateExplainedPage() {
  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8 font-sans text-gray-200">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Hero */}
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D0A65E] overflow-hidden">
            <div className="px-5 py-4 md:px-6 md:py-5" style={{ backgroundColor: '#D0A65E' }}>
              <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow-sm font-mono tracking-tight text-[#FFF5E7]">Climate Change</h1>
              <div className="flex items-center gap-2 mt-3">
                <BookOpen className="h-5 w-5 text-[#FFF5E7]/80" />
                <p className="text-sm uppercase tracking-[0.3em] text-[#FFF5E7]/80 font-mono">Explainer</p>
              </div>
            </div>
            <div className="bg-gray-950/90 backdrop-blur-md px-5 py-4 md:px-6 md:py-5">
              <p className="text-sm md:text-lg font-medium max-w-3xl text-gray-300">
                A plain-English guide to the science behind climate change – what&apos;s happening, why it matters, and the key concepts you&apos;ll encounter in climate data.
              </p>
            </div>
          </div>

          {/* Key facts */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
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

          {/* How it works */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-5">How Climate Change Works</h2>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                The sun&apos;s energy passes through the atmosphere and warms the Earth&apos;s surface. The surface radiates this energy back as infrared heat, but greenhouse gases – primarily CO₂, methane, and nitrous oxide – absorb some of that outgoing heat and re-emit it in all directions, warming the lower atmosphere. This is the <strong className="text-white">greenhouse effect</strong>, and it&apos;s entirely natural.
              </p>
              <p>
                The problem begins when human activities – burning coal, oil, and gas; deforestation; agriculture – release billions of extra tonnes of greenhouse gases. Since the Industrial Revolution, CO₂ concentrations have risen over 50%, intensifying the greenhouse effect and trapping more heat than the planet can radiate away.
              </p>
              <p>
                This extra energy doesn&apos;t just raise the thermometer. It powers the entire climate system: warmer oceans fuel stronger storms, melting ice raises sea levels, shifting rainfall patterns cause droughts in some regions and floods in others, and ecosystems struggle to adapt to the pace of change.
              </p>
              <p>
                Critically, the climate system contains <strong className="text-white">feedback loops</strong> that can amplify warming. Melting Arctic ice, for example, exposes dark ocean water that absorbs more solar heat – accelerating further melting. Thawing permafrost releases stored methane, adding more greenhouse gas. These feedbacks mean that small temperature rises can trigger larger, self-reinforcing changes.
              </p>
              <p>
                Scientists have identified several <strong className="text-white">tipping points</strong> – thresholds beyond which changes become irreversible on human timescales. The collapse of the West Antarctic Ice Sheet, dieback of the Amazon rainforest, and disruption of Atlantic ocean circulation are among the most studied. The IPCC warns that some tipping points could be crossed between 1.5 °C and 2 °C of warming.
              </p>
            </div>
          </section>

          {/* Glossary */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
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

          {/* Explore our data pages */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-5">Explore Climate Data</h2>
            <p className="text-sm text-gray-400 mb-4">See these concepts in action with real-time data on our dashboard pages:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { href: "/climate-dashboard", label: "Global & Local Climate", color: "text-white", desc: "Temperature anomalies, CO₂ trends" },
                { href: "/planetary-boundaries", label: "Planetary Boundaries", color: "text-red-400", desc: "Nine Earth-system thresholds" },
                { href: "/greenhouse-gases", label: "Greenhouse Gases", color: "text-amber-400", desc: "CO₂, methane & N₂O concentrations" },
                { href: "/sea-levels-ice", label: "Sea Levels & Ice", color: "text-teal-400", desc: "Sea level rise, Arctic ice extent" },
                { href: "/extreme-weather", label: "Extreme Weather", color: "text-orange-400", desc: "Disasters, storms & heatwaves" },
                { href: "/emissions", label: "CO₂ Emissions", color: "text-rose-400", desc: "Country rankings & global trends" },
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
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
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
                  <ExternalLink className="h-4 w-4 text-[#D0A65E] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#D0A65E] transition-colors">{name}</p>
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
