import { Metadata } from "next";
import Link from "next/link";
import {
  Thermometer, Wind, Droplets, Mountain, Snowflake, Flame,
  ArrowUpRight, Globe, TreePine, AlertTriangle, BookOpen, ExternalLink, Waves, Compass,
} from "lucide-react";
import { WARMING_DRIVERS } from "@/lib/climate/warming-drivers";
import { StaticFAQPanel, FaqJsonLd } from '@/app/_components/seo/StaticFAQPanel';
import { CLIMATE_EXPLAINED_FAQ } from './climate-explained-faq';

export const metadata: Metadata = {
  title: "Climate Change Explained | 4 Billion Years On",
  description:
    "A plain-English guide to climate change: greenhouse gases, global warming, feedback loops, tipping points, and what the science really says.",
  openGraph: {
    title: "Climate Change Explained | 4 Billion Years On",
    description:
      "A plain-English guide to climate change: greenhouse gases, global warming, feedback loops, tipping points, and what the science really says.",
    images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
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
  { term: "ENSO", definition: "El Niño–Southern Oscillation – a natural climate cycle in the tropical Pacific that alternates between warm (El Niño) and cool (La Niña) phases every 2–7 years, influencing global temperatures and weather." },
  { term: "El Niño", definition: "The warm phase of ENSO. Weakened trade winds let warm water spread east across the Pacific, temporarily boosting global temperatures and shifting rainfall patterns worldwide." },
  { term: "La Niña", definition: "The cool phase of ENSO. Strengthened trade winds push warm water west, bringing cooler surface water to the eastern Pacific and temporarily suppressing global temperature rise." },
  { term: "NAO", definition: "The North Atlantic Oscillation – a pressure seesaw between Iceland and the Azores that governs winter weather across Europe and eastern North America." },
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
          <div className="relative z-10 rounded-2xl shadow-xl border-2 border-[#D0A65E] overflow-hidden" style={{ background: 'linear-gradient(to bottom, #D0A65E 0%, #D0A65E 20px, transparent 20px)' }}>
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
                <div key={i} className="flex items-start gap-3 bg-gray-800/60 rounded-xl p-3.5 border border-gray-700/50">
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

          {/* Natural climate patterns: ENSO, NAO, etc. */}
          <section className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-5 flex items-start gap-2">
              <Waves className="h-5 w-5 shrink-0 text-blue-400 mt-1" />
              <span className="min-w-0 flex-1">Natural Climate Patterns</span>
            </h2>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">
              Earth&apos;s climate isn&apos;t driven by greenhouse gases alone. Several large-scale ocean–atmosphere cycles shift weather patterns around the globe on timescales of months to decades. Understanding these patterns is essential for interpreting year-to-year swings in temperature, rainfall, and extreme weather.
            </p>
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-white mb-1">ENSO – El Ni&ntilde;o / La Ni&ntilde;a</h3>
                <p className="text-sm text-gray-300 leading-relaxed mb-2">
                  The <strong className="text-white">El Ni&ntilde;o–Southern Oscillation (ENSO)</strong> is the most influential natural climate pattern on Earth. It describes a recurring shift in sea-surface temperatures across the tropical Pacific Ocean, typically cycling every 2–7 years. See our <Link href="/climate/enso" className="text-sky-300 underline decoration-sky-400/40 underline-offset-2 hover:decoration-sky-300">live ENSO tracker</Link> for the current state, regional impacts and NOAA forecast.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mb-2">
                  <div className="bg-red-950/30 rounded-xl p-3.5 border border-red-900/40">
                    <p className="text-sm font-semibold text-red-400 mb-1">El Ni&ntilde;o (warm phase)</p>
                    <p className="text-xs text-gray-400 leading-relaxed">Trade winds weaken, allowing warm water to spread eastward across the Pacific. This releases extra heat into the atmosphere, temporarily boosting global temperatures by 0.1–0.2 °C. El Ni&ntilde;o years often bring drought to Australia and South-East Asia, heavier rainfall to the Americas, and milder winters in northern Europe.</p>
                  </div>
                  <div className="bg-blue-950/30 rounded-xl p-3.5 border border-blue-900/40">
                    <p className="text-sm font-semibold text-blue-400 mb-1">La Ni&ntilde;a (cool phase)</p>
                    <p className="text-xs text-gray-400 leading-relaxed">Trade winds strengthen, pushing warm water west and bringing cool, nutrient-rich water to the surface in the eastern Pacific. La Ni&ntilde;a temporarily masks global warming, and is associated with wetter conditions in Australia, drier weather in the southern US, and more Atlantic hurricanes.</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  <strong className="text-gray-400">Why it matters for climate data:</strong> Record-warm years (like 2016 and 2023) often coincide with strong El Ni&ntilde;o events. When interpreting any single year&apos;s temperature, it&apos;s important to consider whether ENSO gave it a boost or applied the brakes.
                </p>
              </div>

              <div className="border-t border-gray-800/60 pt-5">
                <h3 className="text-base font-bold text-white mb-1">NAO – North Atlantic Oscillation</h3>
                <p className="text-sm text-gray-300 leading-relaxed mb-2">
                  The <strong className="text-white">NAO</strong> describes the pressure difference between the Icelandic Low and the Azores High. It is the dominant driver of winter weather across Europe and eastern North America.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mb-2">
                  <div className="bg-gray-800/60 rounded-xl p-3.5 border border-gray-700/50">
                    <p className="text-sm font-semibold text-amber-400 mb-1">Positive NAO</p>
                    <p className="text-xs text-gray-400 leading-relaxed">A strong pressure gradient steers the jet stream northward, bringing mild, wet, and windy winters to northern Europe and drier conditions to the Mediterranean.</p>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl p-3.5 border border-gray-700/50">
                    <p className="text-sm font-semibold text-teal-400 mb-1">Negative NAO</p>
                    <p className="text-xs text-gray-400 leading-relaxed">A weaker gradient lets the jet stream meander south, allowing Arctic air to plunge into Europe and the eastern US. This brings cold snaps, snow, and blocking high-pressure systems.</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-800/60 pt-5">
                <h3 className="text-base font-bold text-white mb-1">Other Key Oscillations</h3>
                <div className="space-y-3">
                  <div className="bg-gray-800/60 rounded-xl p-3.5 border border-gray-700/50">
                    <p className="text-sm font-semibold text-white mb-0.5">AMO – Atlantic Multidecadal Oscillation</p>
                    <p className="text-xs text-gray-400 leading-relaxed">A 60–80 year cycle in North Atlantic sea-surface temperatures that influences hurricane activity, Sahel rainfall, and European summer temperatures. Currently in its warm phase since the mid-1990s.</p>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl p-3.5 border border-gray-700/50">
                    <p className="text-sm font-semibold text-white mb-0.5">PDO – Pacific Decadal Oscillation</p>
                    <p className="text-xs text-gray-400 leading-relaxed">Like a slow-motion ENSO, the PDO shifts Pacific temperatures on 20–30 year timescales. Its warm phase tends to enhance El Ni&ntilde;o effects, while its cool phase amplifies La Ni&ntilde;a impacts.</p>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl p-3.5 border border-gray-700/50">
                    <p className="text-sm font-semibold text-white mb-0.5">IOD – Indian Ocean Dipole</p>
                    <p className="text-xs text-gray-400 leading-relaxed">A temperature gradient across the Indian Ocean that strongly affects rainfall in East Africa, India, and Australia. A positive IOD can compound drought conditions in Australia when paired with El Ni&ntilde;o.</p>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl p-3.5 border border-gray-700/50">
                    <p className="text-sm font-semibold text-white mb-0.5">MJO – Madden-Julian Oscillation</p>
                    <p className="text-xs text-gray-400 leading-relaxed">A 30–60 day tropical weather pattern that moves eastward around the equator, modulating monsoon strength, tropical cyclone formation, and even mid-latitude weather patterns.</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-800/60 pt-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <strong className="text-gray-400">The bigger picture:</strong> These natural oscillations redistribute heat around the planet – they don&apos;t create or destroy it. While El Ni&ntilde;o can temporarily push global temperatures to record highs and La Ni&ntilde;a can temporarily suppress them, the long-term warming trend from greenhouse gases continues regardless. In climate data, separating the signal (human-caused warming) from the noise (natural variability) is one of the core challenges.
                </p>
              </div>
            </div>
          </section>

          {/* Why some places warm faster than others - regional drivers */}
          <section id="warming-drivers" className="bg-gray-950/90 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-xl border-2 border-[#D0A65E]">
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mb-2 flex items-start gap-2">
              <Compass className="h-5 w-5 shrink-0 text-teal-300 mt-1" />
              <span className="min-w-0 flex-1">Why Some Places Warm Faster Than Others</span>
            </h2>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">
              The global average hides huge regional variation. Finland and Sweden are warming at twice the global rate. Svalbard has already warmed nearly 3.5°C. Tropical regions warm slowly in absolute terms but are already close to the limits of human heat tolerance. These are the mechanisms that explain the pattern - the same terms you&apos;ll see highlighted across this site will link back here.
            </p>
            <div className="space-y-3">
              {WARMING_DRIVERS.map((d) => (
                <div
                  key={d.id}
                  id={d.id}
                  className="rounded-xl border border-gray-700/50 bg-gray-800/60 p-4 scroll-mt-24"
                >
                  <h3 className="text-base font-bold text-teal-200 mb-1">{d.term}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed mb-2">{d.long}</p>
                  <a
                    href={d.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-teal-300 transition-colors"
                  >
                    Source: {d.source.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-400">The bigger picture:</strong> most regions experience several of these at once. Finland combines Arctic amplification, snow-albedo feedback and seasonal shifts; the Mediterranean combines dry-soil amplification, heat domes and a weakening jet stream; tropical cities combine urban heat islands with the narrow thermal tolerance of life at low latitudes.
            </p>
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
                { href: "/climate/enso", label: "El Niño / La Niña", color: "text-sky-400", desc: "Live ENSO state, Niño 3.4 & forecast" },
                { href: "/emissions", label: "CO₂ Emissions", color: "text-rose-400", desc: "Country rankings & global trends" },
              ].map(({ href, label, color, desc }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 bg-gray-900 rounded-xl p-3.5 border border-[#D0A65E]/30 hover:border-[#D0A65E]/60 hover:bg-gray-800 transition-colors group"
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
                  className="flex items-start gap-3 bg-gray-900 rounded-xl p-3.5 border border-[#D0A65E]/30 hover:border-[#D0A65E]/60 hover:bg-gray-800 transition-colors group"
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

          {/* Frequently Asked Questions */}
          <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-[#D0A65E]/30 flex-1" />
            <h2 className="text-lg font-bold font-mono text-[#FFF5E7] flex items-center gap-2 bg-gray-950 px-5 py-2 rounded-full border border-[#D0A65E]/50 shadow-lg [&>svg]:shrink-0">
              <BookOpen className="h-5 w-5" />
              <span>FAQs</span>
            </h2>
            <div className="h-px bg-[#D0A65E]/30 flex-1" />
          </div>
          <StaticFAQPanel headingId="climate-explained-faq-heading" qa={CLIMATE_EXPLAINED_FAQ} />
          <FaqJsonLd qa={CLIMATE_EXPLAINED_FAQ} />

        </div>
      </div>
    </main>
  );
}
