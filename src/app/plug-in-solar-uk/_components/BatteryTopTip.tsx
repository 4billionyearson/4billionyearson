import Link from 'next/link';
import { useId } from 'react';
import { Battery, ExternalLink } from 'lucide-react';
import { applyAmazonAffiliateTag } from '@/lib/amazon';

const BLOG_HREF =
  '/posts/what-do-you-want-for-your-birthday-a-battery-bank-for-my-bedroom-to-help-save-the-planet';

type SearchLink = { label: string; query: string; note: string };

const SEARCHES: SearchLink[] = [
  {
    label: 'Portable power stations 1000Wh',
    query: 'portable power station 1000Wh',
    note: 'Sweet-spot capacity for shifting an evening peak',
  },
  {
    label: 'EcoFlow River 2 Max',
    query: 'EcoFlow River 2 Max',
    note: '~512Wh, often £200-£300',
  },
  {
    label: 'Bluetti EB55',
    query: 'Bluetti EB55',
    note: '537Wh LiFePO4, plug-and-play',
  },
];

function amazonSearchUrl(q: string): string {
  const url = `https://www.amazon.co.uk/s?k=${encodeURIComponent(q)}`;
  return applyAmazonAffiliateTag(url, 'GB');
}

export function BatteryTopTip() {
  const svgIdPrefix = useId().replace(/:/g, '');
  const sunGradId = `${svgIdPrefix}-ttSunGrad`;
  const screenGradId = `${svgIdPrefix}-ttScreenGrad`;
  const psBodyId = `${svgIdPrefix}-ttPSBody`;
  const arrowId = `${svgIdPrefix}-ttArrow`;

  return (
    <section className="rounded-2xl border-2 border-[#D2E369] bg-gray-950 shadow-xl px-5 pb-5 pt-2 md:px-6 md:pb-6 md:pt-3">
      <div className="mb-3 flex items-start gap-2 sm:items-center">
        <Battery className="mt-0.5 h-5 w-5 shrink-0 text-[#D2E369] sm:mt-0" />
        <h2 className="text-base font-bold font-mono leading-tight tracking-tight text-[#D2E369] sm:text-lg md:text-xl">
          Top Tip - a cheaper way to start
        </h2>
      </div>

      {/* Time-shift diagram */}
      <figure aria-label="Battery time-shift diagram" className="mb-4 rounded-xl border border-[#D2E369]/30 bg-gradient-to-r from-sky-950/40 via-gray-950/60 to-emerald-950/30 p-2 md:p-4">
        <div
          className={
            'overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0 pb-2 ' +
            '[&::-webkit-scrollbar]:h-1.5 ' +
            '[&::-webkit-scrollbar-track]:bg-[#D2E369]/5 ' +
            '[&::-webkit-scrollbar-track]:rounded-full ' +
            '[&::-webkit-scrollbar-thumb]:bg-[#D2E369]/40 ' +
            '[&::-webkit-scrollbar-thumb]:rounded-full ' +
            '[scrollbar-color:rgba(210,227,105,0.4)_rgba(210,227,105,0.05)] ' +
            '[scrollbar-width:thin]'
          }
        >
          <svg
            viewBox="0 0 780 230"
            role="img"
            aria-label="Time-shift: solar plugs into one wall socket; a portable power station charges from the adjacent socket by day, then in the evening you plug the TV and games console directly into the power station's own AC outlets"
            className="h-auto w-[780px] md:w-full md:min-w-0"
          >
          <defs>
            <linearGradient id={sunGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFE066" />
              <stop offset="100%" stopColor="#FFA94D" />
            </linearGradient>
            <linearGradient id={screenGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id={psBodyId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#D2E369" />
            </marker>
          </defs>

          {/* ══════ ROW 1: SOLAR → INVERTER → WALL ══════ */}

          {/* Sun — same style as HowItWorksDiagram: r=28, rays r1=36→48 */}
          <g>
            <circle cx="62" cy="82" r="28" fill={`url(#${sunGradId})`} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
              const rad = (Math.PI * deg) / 180;
              return (
                <line
                  key={i}
                  x1={62 + 36 * Math.cos(rad)}
                  y1={82 + 36 * Math.sin(rad)}
                  x2={62 + 48 * Math.cos(rad)}
                  y2={82 + 48 * Math.sin(rad)}
                  stroke="#FFD43B"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              );
            })}
            <text x="62" y="154" textAnchor="middle" fontSize="10" fill="#FFE066" fontFamily="monospace" fontWeight="600">SUN</text>
            <text x="62" y="168" textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="sans-serif">free fuel</text>
          </g>

          {/* Arrow sun → inverter */}
          <line x1="96" y1="65" x2="114" y2="65" stroke="#D2E369" strokeWidth="1.5" strokeDasharray="3 2" />
          <polygon points="114,61 122,65 114,69" fill="#D2E369" />

          {/* Inverter */}
          <rect x="125" y="47" width="56" height="36" rx="5" fill={`url(#${psBodyId})`} stroke="#6b7280" strokeWidth="1.5" />
          <text x="153" y="63" textAnchor="middle" fontSize="7.5" fill="#d1d5db" fontFamily="monospace">MICRO-</text>
          <text x="153" y="74" textAnchor="middle" fontSize="7.5" fill="#d1d5db" fontFamily="monospace">INVERTER</text>

          {/* Arrow inverter → wall socket 1 */}
          <line x1="183" y1="65" x2="224" y2="65" stroke="#D2E369" strokeWidth="1.5" strokeDasharray="3 2" />
          <polygon points="224,61 232,65 224,69" fill="#D2E369" />
          <text x="204" y="55" textAnchor="middle" fontSize="8" fill="#D2E369" fontFamily="monospace">plugs in</text>

          {/* Wall plate (vertical) — two UK sockets */}
          <rect x="232" y="20" width="60" height="142" rx="6" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
          <text x="262" y="14" textAnchor="middle" fontSize="8" fill="#6b7280" fontFamily="monospace">WALL</text>

          {/* Socket top — UK BS 1363: earth pin top-centre (vertical), L+N below (horizontal) */}
          <g>
            <rect x="238" y="36" width="48" height="48" rx="6" fill="#1a2535" stroke="#D2E369" strokeWidth="1.5" />
            {/* Earth pin slot */}
            <rect x="259" y="44" width="6" height="12" rx="1.5" fill="#050d1a" stroke="#9ca3af" strokeWidth="1" />
            {/* Live slot */}
            <rect x="245" y="63" width="12" height="5" rx="1.5" fill="#050d1a" stroke="#9ca3af" strokeWidth="1" />
            {/* Neutral slot */}
            <rect x="265" y="63" width="12" height="5" rx="1.5" fill="#050d1a" stroke="#9ca3af" strokeWidth="1" />
          </g>

          {/* Socket bottom */}
          <g>
            <rect x="238" y="100" width="48" height="48" rx="6" fill="#1a2535" stroke="#D2E369" strokeWidth="1.5" />
            <rect x="259" y="108" width="6" height="12" rx="1.5" fill="#050d1a" stroke="#9ca3af" strokeWidth="1" />
            <rect x="245" y="127" width="12" height="5" rx="1.5" fill="#050d1a" stroke="#9ca3af" strokeWidth="1" />
            <rect x="265" y="127" width="12" height="5" rx="1.5" fill="#050d1a" stroke="#9ca3af" strokeWidth="1" />
          </g>

          {/* Caption under sockets */}
          <text x="262" y="174" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="monospace">SOCKETS</text>

          {/* ══════ POWER STATION (single, centre) ══════ */}
          {/* Arrow socket ② → power station */}
          <line x1="292" y1="124" x2="360" y2="124" stroke="#D2E369" strokeWidth="1.5" strokeDasharray="3 2" />
          <polygon points="360,120 368,124 360,128" fill="#D2E369" />
          <text x="328" y="116" textAnchor="middle" fontSize="8" fill="#D2E369" fontFamily="monospace">charges by day</text>
          <text x="328" y="136" textAnchor="middle" fontSize="7" fill="#9ca3af" fontFamily="monospace">(excess solar)</text>

          {/* Power station body — realistic-ish portable power station look */}
          {/* Carry handle */}
          <path d="M 392 32 Q 392 18 422 18 Q 452 18 452 32" fill="none" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
          <rect x="386" y="28" width="72" height="6" rx="2" fill="#4b5563" />
          {/* Main body */}
          <rect x="368" y="34" width="108" height="138" rx="10" fill={`url(#${psBodyId})`} stroke="#9ca3af" strokeWidth="1.8" />
          {/* Inner bezel */}
          <rect x="376" y="42" width="92" height="122" rx="7" fill="#111827" stroke="#4b5563" strokeWidth="0.8" />

          {/* LCD screen */}
          <rect x="384" y="50" width="76" height="32" rx="4" fill={`url(#${screenGradId})`} stroke="#0ea5e9" strokeWidth="0.8" strokeOpacity="0.5" />
          <text x="392" y="64" fontSize="7" fill="#D2E369" fontFamily="monospace">CHG</text>
          <text x="455" y="64" textAnchor="end" fontSize="11" fill="#D2E369" fontFamily="monospace" fontWeight="bold">68%</text>
          {/* Mini bar graph on screen */}
          <rect x="392" y="70" width="56" height="6" rx="1" fill="#0b1220" />
          <rect x="392" y="70" width="38" height="6" rx="1" fill="#D2E369" opacity="0.75" />
          <text x="455" y="76" textAnchor="end" fontSize="6" fill="#94a3b8" fontFamily="monospace">512Wh</text>

          {/* Two AC outlets (UK BS 1363 style) */}
          <g>
            <rect x="386" y="92" width="32" height="38" rx="5" fill="#1a2535" stroke="#6b7280" strokeWidth="1" />
            {/* earth */}
            <rect x="400" y="97" width="4" height="9" rx="1" fill="#050d1a" stroke="#9ca3af" strokeWidth="0.8" />
            {/* live */}
            <rect x="390" y="113" width="8" height="4" rx="1" fill="#050d1a" stroke="#9ca3af" strokeWidth="0.8" />
            {/* neutral */}
            <rect x="402" y="113" width="8" height="4" rx="1" fill="#050d1a" stroke="#9ca3af" strokeWidth="0.8" />
            <text x="402" y="126" textAnchor="middle" fontSize="6" fill="#6b7280" fontFamily="monospace">AC</text>
          </g>
          <g>
            <rect x="426" y="92" width="32" height="38" rx="5" fill="#1a2535" stroke="#6b7280" strokeWidth="1" />
            {/* earth */}
            <rect x="440" y="97" width="4" height="9" rx="1" fill="#050d1a" stroke="#9ca3af" strokeWidth="0.8" />
            {/* live */}
            <rect x="430" y="113" width="8" height="4" rx="1" fill="#050d1a" stroke="#9ca3af" strokeWidth="0.8" />
            {/* neutral */}
            <rect x="442" y="113" width="8" height="4" rx="1" fill="#050d1a" stroke="#9ca3af" strokeWidth="0.8" />
            <text x="442" y="126" textAnchor="middle" fontSize="6" fill="#6b7280" fontFamily="monospace">AC</text>
          </g>

          {/* USB ports row */}
          <rect x="386" y="138" width="72" height="14" rx="2" fill="#0b1220" stroke="#4b5563" strokeWidth="0.8" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={392 + i * 16} y={143} width="10" height="4" rx="0.5" fill="#1f2937" />
          ))}

          {/* Power LED */}
          <circle cx="448" cy="158" r="3" fill="#D2E369">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Label */}
          <text x="422" y="190" textAnchor="middle" fontSize="9" fill="#FFF5E7" fontFamily="monospace" fontWeight="bold">PORTABLE</text>
          <text x="422" y="201" textAnchor="middle" fontSize="9" fill="#FFF5E7" fontFamily="monospace" fontWeight="bold">POWER STATION</text>
          <text x="422" y="213" textAnchor="middle" fontSize="7.5" fill="#9ca3af" fontFamily="monospace">£100–£200 · ~500 Wh</text>

          {/* ══════ TV + CONSOLE on the right ══════ */}
          {/* "Plug in directly at peak" label — sits above the arrows, between PS and devices */}
          <text x="575" y="42" textAnchor="middle" fontSize="8.5" fill="#D2E369" fontFamily="monospace">evening: plug straight in</text>

          {/* Arrow from PS outlet 1 → TV (extends to TV's left edge) */}
          <line x1="476" y1="111" x2="540" y2="78" stroke="#D2E369" strokeWidth="1.5" strokeDasharray="3 2" markerEnd={`url(#${arrowId})`} />

          {/* TV */}
          <g>
            <rect x="540" y="52" width="90" height="56" rx="4" fill="#111827" stroke="#9ca3af" strokeWidth="1.5" />
            <rect x="546" y="58" width="78" height="44" rx="2" fill="#1e3a5f" />
            {/* TV stand */}
            <rect x="578" y="108" width="14" height="6" rx="1" fill="#4b5563" />
            <rect x="566" y="114" width="38" height="3" rx="1" fill="#4b5563" />
            <text x="585" y="130" textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="monospace">TV</text>
          </g>

          {/* Arrow from PS outlet 2 → console (extends to console's left edge) */}
          <line x1="476" y1="125" x2="540" y2="165" stroke="#D2E369" strokeWidth="1.5" strokeDasharray="3 2" markerEnd={`url(#${arrowId})`} />

          {/* Games console */}
          <g>
            <rect x="540" y="150" width="86" height="30" rx="6" fill="#0b1220" stroke="#9ca3af" strokeWidth="1.5" />
            <circle cx="556" cy="165" r="5" fill="#1f2937" stroke="#6b7280" strokeWidth="0.8" />
            <circle cx="610" cy="165" r="5" fill="#1f2937" stroke="#6b7280" strokeWidth="0.8" />
            <rect x="572" y="161" width="22" height="8" rx="3" fill="#4b5563" />
            {/* LED */}
            <circle cx="583" cy="165" r="1.2" fill="#D2E369" />
            <text x="583" y="196" textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="monospace">CONSOLE</text>
          </g>

          {/* NOTE: polygon arrowheads replaced by SVG marker above */}

          {/* Saving callout — right-side, vertically centred between TV and console */}
          <g>
            <rect x="650" y="89" width="112" height="48" rx="7" fill="#D2E369" opacity="0.1" stroke="#D2E369" strokeWidth="1" strokeOpacity="0.45" />
            <text x="706" y="107" textAnchor="middle" fontSize="10" fill="#D2E369" fontFamily="monospace" fontWeight="bold">~30p/kWh</text>
            <text x="706" y="120" textAnchor="middle" fontSize="9" fill="#D2E369" fontFamily="monospace">saved</text>
            <text x="706" y="131" textAnchor="middle" fontSize="7.5" fill="#9ca3af" fontFamily="monospace">vs peak grid</text>
          </g>
          </svg>
        </div>
      </figure>

      <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
        <p>
          A plug-in solar kit pays back faster if you also time-shift your
          evening peak - but you don&apos;t necessarily need to spend £1,000+
          on a dedicated home battery to get a good amount of benefit. A
          £100-£200 camping power station can soak up the excess your
          panels generate in the middle of the day (when no-one&apos;s home
          to use it), then run your TV, computer, games console (e.g. teenager&apos;s
          bedroom) during the 5-7pm peak - capturing some of the saving that a full grid/plug-in battery would.
        </p>
        <p>
          Plug-in solar systems can&apos;t yet sell power back to the grid, so
          any midday excess your panels produce while the house is empty is
          simply wasted. A small battery turns that wasted generation into
          ~30p-per-kWh of avoided peak-rate import - which is why storage
          is the single highest-value upgrade you can layer on top.
        </p>

        <blockquote className="border-l-2 border-[#D2E369]/60 pl-4 my-4 text-gray-300 italic">
          If just 5% of the UK&apos;s 28 million households shifted 1 kWh a
          day off the evening peak, that&apos;s 1.4 GWh moved daily and
          roughly 200-300 MW shaved during 5-7pm - the output of a small gas
          peaker plant, gone.{' '}
          <Link
            href={BLOG_HREF}
            className="not-italic text-[#D2E369] hover:text-[#E5F08A] underline"
          >
            Full write-up here
          </Link>
          .
        </blockquote>
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-mono uppercase tracking-wider text-[#D2E369] mb-2">
          Cheap power stations on Amazon UK
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {SEARCHES.map((s) => (
            <a
              key={s.label}
              href={amazonSearchUrl(s.query)}
              target="_blank"
              rel="nofollow sponsored noopener"
              className="group rounded-xl border border-[#D2E369]/20 bg-gray-900/50 p-3 hover:border-[#D2E369]/50 hover:bg-gray-900 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-[#FFF5E7] group-hover:text-[#D2E369]">
                  {s.label}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-gray-500 group-hover:text-[#D2E369] flex-shrink-0 mt-0.5" />
              </div>
              <p className="mt-1 text-xs text-gray-400 leading-snug">{s.note}</p>
            </a>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          Search links - we earn a small commission on Amazon UK purchases at
          no extra cost to you.
        </p>
      </div>
    </section>
  );
}
