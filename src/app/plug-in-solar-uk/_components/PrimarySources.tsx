import { ExternalLink, Landmark, ShieldCheck, Cpu } from 'lucide-react';

/**
 * Hand-curated list of UK PRIMARY sources for the plug-in solar story.
 * These are the original government / regulator / standards body pages
 * we research from each day - the ones we want users (and AI crawlers)
 * to verify the page against.
 *
 * Always rendered, regardless of what Google Search grounding returns,
 * so the page is never accused of merely repackaging third-party press
 * coverage and so visitors can read the source material direct.
 */
type Source = {
  title: string;
  description: string;
  url: string;
};

const GOV_SOURCES: Source[] = [
  {
    title: 'GOV.UK — Department for Energy Security and Net Zero (DESNZ)',
    description:
      "DESNZ is the lead department for plug-in solar policy. New press releases, consultations and ministerial statements (Ed Miliband) are published here first.",
    url: 'https://www.gov.uk/government/organisations/department-for-energy-security-and-net-zero',
  },
  {
    title: 'GOV.UK — DESNZ news feed',
    description:
      'Live press release stream for DESNZ. Filter by date to see the latest announcements on plug-in / balcony solar.',
    url: 'https://www.gov.uk/search/news-and-communications?organisations[]=department-for-energy-security-and-net-zero',
  },
  {
    title: 'GOV.UK — open and recent consultations',
    description:
      'Search "plug-in solar", "balcony solar" or "domestic micro-generation" to see the open and recently closed UK government consultations.',
    url: 'https://www.gov.uk/search/policy-papers-and-consultations?keywords=plug-in+solar',
  },
  {
    title: 'Ed Miliband MP — Secretary of State for Energy Security and Net Zero',
    description:
      "The Secretary of State's GOV.UK page, where speeches and announcements (including the March 2026 plug-in solar legalisation) are listed.",
    url: 'https://www.gov.uk/government/people/edward-miliband',
  },
];

const REG_SOURCES: Source[] = [
  {
    title: 'Ofgem — Smart Export Guarantee (SEG)',
    description:
      'The official SEG scheme page. Ofgem decides whether plug-in solar can apply for export payments and what the rules are.',
    url: 'https://www.ofgem.gov.uk/environmental-and-social-schemes/smart-export-guarantee-seg',
  },
  {
    title: 'IET Electrical — BS 7671 / Wiring Regulations',
    description:
      'The IET runs the BS 7671 Wiring Regulations. Amendment 4 (April 2026) is the document that legalised plug-in solar in the UK.',
    url: 'https://electrical.theiet.org/bs-7671/',
  },
  {
    title: 'BSI Group — Standards committees',
    description:
      'BSI is drafting the dedicated UK product standard for plug-in solar systems. Committee pages and open consultations are listed here.',
    url: 'https://www.bsigroup.com/en-GB/standards/',
  },
  {
    title: 'Energy Networks Association (ENA) — connection standards',
    description:
      'The ENA owns the G98 / G99 connection standards that every DNO follows. Updates to the notification process appear here first.',
    url: 'https://www.energynetworks.org/customers/find-my-network-operator',
  },
  {
    title: 'Electrical Safety First — plug-in solar guidance',
    description:
      'Independent UK charity for electrical safety. Issues consumer-facing warnings and reviews of imported plug-in solar kits.',
    url: 'https://www.electricalsafetyfirst.org.uk/',
  },
];

export function PrimarySources() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-300 leading-relaxed">
        We research this page directly from the UK government and the electrical regulators every
        day, rather than from secondary press coverage. The links below are the same primary
        sources our daily Gemini brief grounds against — go straight to them if you want the
        original wording.
      </p>

      <SourceGroup
        icon={<Landmark className="h-4 w-4" />}
        heading="UK government (DESNZ)"
        sources={GOV_SOURCES}
      />
      <SourceGroup
        icon={<ShieldCheck className="h-4 w-4" />}
        heading="Electrical regulators & standards bodies"
        sources={REG_SOURCES}
      />

      <p className="text-xs text-gray-500 italic">
        We have no commercial or political relationship with any of these bodies. They are listed
        because they are the authoritative public sources for UK plug-in solar policy and safety.
      </p>
    </div>
  );
}

function SourceGroup({
  icon,
  heading,
  sources,
}: {
  icon: React.ReactNode;
  heading: string;
  sources: Source[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#D2E369]">
        {icon}
        <span>{heading}</span>
      </h3>
      <ul className="grid gap-3 md:grid-cols-2">
        {sources.map((s) => (
          <li
            key={s.url}
            className="rounded-xl border border-[#D2E369]/20 bg-gray-900/40 p-3 hover:border-[#D2E369]/50 transition-colors"
          >
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-[#FFF5E7] group-hover:text-[#D2E369] transition-colors">
                  {s.title}
                </h4>
                <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-500 group-hover:text-[#D2E369] transition-colors" />
              </div>
              <p className="mt-1 text-xs text-gray-400 leading-relaxed">{s.description}</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PrimarySourcesIcon() {
  return <Cpu className="h-5 w-5" />;
}
