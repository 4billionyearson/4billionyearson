/**
 * Inline SVG diagram showing the four-stage flow of a plug-in solar
 * system: Sun → Panel → Micro-inverter (in plug form) → Home, with the
 * grid invisibly topping up whatever the panel isn't producing, plus an
 * optional battery branch that stores excess and discharges later. All
 * inline so it ships in the SSR HTML and works for AI / search snapshots
 * without loading any images.
 */
export function HowItWorksDiagram() {
  return (
    <figure
      aria-label="Plug-in solar flow diagram"
      className="my-2 rounded-2xl border border-[#D2E369]/30 bg-gradient-to-br from-sky-950/40 via-gray-950/60 to-emerald-950/30 p-4 md:p-6"
    >
      <svg
        viewBox="0 0 720 280"
        role="img"
        aria-labelledby="howItWorksTitle howItWorksDesc"
        className="w-full h-auto"
      >
        <title id="howItWorksTitle">How plug-in solar works</title>
        <desc id="howItWorksDesc">
          Sunlight hits a solar panel which feeds DC power into a micro-inverter, which converts it
          into 230 V AC and pushes it back through a standard three-pin plug into the home wiring.
          An optional battery can store excess generation for use later, and the grid invisibly
          tops up whatever the panel isn't producing.
        </desc>
        <defs>
          <linearGradient id="sunGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="100%" stopColor="#FFA94D" />
          </linearGradient>
          <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c4d6b" />
            <stop offset="100%" stopColor="#082f49" />
          </linearGradient>
          <linearGradient id="houseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D2E369" />
            <stop offset="100%" stopColor="#a8c44a" />
          </linearGradient>
          <linearGradient id="batteryGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="60%" stopColor="#34d399" />
            <stop offset="60%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#D2E369" />
          </marker>
          <marker
            id="arrowDashed"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#34d399" />
          </marker>
        </defs>

        {/* Sun */}
        <g>
          <circle cx="60" cy="70" r="28" fill="url(#sunGrad)" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const r1 = 36;
            const r2 = 48;
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={60 + Math.cos(rad) * r1}
                y1={70 + Math.sin(rad) * r1}
                x2={60 + Math.cos(rad) * r2}
                y2={70 + Math.sin(rad) * r2}
                stroke="#FFD43B"
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
          <text x="60" y="140" textAnchor="middle" className="fill-[#FFE066]" style={{ font: '600 14px ui-monospace, Menlo, monospace' }}>
            SUN
          </text>
          <text x="60" y="158" textAnchor="middle" className="fill-gray-400" style={{ font: '11px ui-sans-serif, system-ui' }}>
            free fuel
          </text>
        </g>

        {/* Arrow 1: Sun → Panel */}
        <line x1="110" y1="70" x2="170" y2="70" stroke="#D2E369" strokeWidth={3} strokeDasharray="4 4" markerEnd="url(#arrow)" />

        {/* Panel */}
        <g transform="translate(180, 30)">
          <rect x="0" y="0" width="120" height="80" rx="6" fill="url(#panelGrad)" stroke="#67e8f9" strokeWidth={2} />
          {[0, 1, 2].map((row) =>
            [0, 1, 2, 3, 4].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={6 + col * 22}
                y={6 + row * 23}
                width={20}
                height={21}
                fill="#0e7490"
                opacity={0.5}
                stroke="#67e8f9"
                strokeWidth={0.5}
              />
            ))
          )}
          <text x="60" y="110" textAnchor="middle" className="fill-sky-200" style={{ font: '600 14px ui-monospace, Menlo, monospace' }}>
            PANEL
          </text>
          <text x="60" y="128" textAnchor="middle" className="fill-gray-400" style={{ font: '11px ui-sans-serif, system-ui' }}>
            ~400-880 W DC
          </text>
        </g>

        {/* Arrow 2: Panel → Inverter */}
        <line x1="305" y1="70" x2="365" y2="70" stroke="#D2E369" strokeWidth={3} strokeDasharray="4 4" markerEnd="url(#arrow)" />

        {/* Micro-inverter / plug */}
        <g transform="translate(375, 30)">
          <rect x="0" y="10" width="90" height="60" rx="8" fill="#1f2937" stroke="#D2E369" strokeWidth={2} />
          <text x="45" y="44" textAnchor="middle" className="fill-[#D2E369]" style={{ font: '700 13px ui-monospace, Menlo, monospace' }}>
            DC→AC
          </text>
          <text x="45" y="60" textAnchor="middle" className="fill-gray-400" style={{ font: '10px ui-sans-serif, system-ui' }}>
            800 W max
          </text>
          {/* plug pins */}
          <rect x="22" y="74" width="6" height="14" rx="1" fill="#9ca3af" />
          <rect x="42" y="74" width="6" height="14" rx="1" fill="#9ca3af" />
          <rect x="62" y="74" width="6" height="14" rx="1" fill="#9ca3af" />
          <text x="45" y="110" textAnchor="middle" className="fill-[#D2E369]" style={{ font: '600 14px ui-monospace, Menlo, monospace' }}>
            INVERTER
          </text>
          <text x="45" y="128" textAnchor="middle" className="fill-gray-400" style={{ font: '11px ui-sans-serif, system-ui' }}>
            13 A plug
          </text>
        </g>

        {/* Arrow 3: Inverter → Home */}
        <line x1="470" y1="70" x2="530" y2="70" stroke="#D2E369" strokeWidth={3} strokeDasharray="4 4" markerEnd="url(#arrow)" />

        {/* Home */}
        <g transform="translate(540, 18)">
          {/* roof */}
          <polygon points="60,0 0,40 120,40" fill="#a8c44a" stroke="#D2E369" strokeWidth={2} />
          {/* body */}
          <rect x="10" y="40" width="100" height="55" fill="url(#houseGrad)" stroke="#D2E369" strokeWidth={2} />
          {/* door */}
          <rect x="50" y="65" width="20" height="30" fill="#2C5263" />
          {/* windows */}
          <rect x="20" y="50" width="20" height="15" fill="#2C5263" opacity={0.85} />
          <rect x="80" y="50" width="20" height="15" fill="#2C5263" opacity={0.85} />
          <text x="60" y="120" textAnchor="middle" className="fill-[#D2E369]" style={{ font: '600 14px ui-monospace, Menlo, monospace' }}>
            YOUR HOME
          </text>
          <text x="60" y="138" textAnchor="middle" className="fill-gray-400" style={{ font: '11px ui-sans-serif, system-ui' }}>
            self-consume first
          </text>
        </g>

        {/* ─── Lower row: optional battery + grid ─── */}

        {/* Battery (optional) - sits under the inverter */}
        <g transform="translate(360, 180)">
          {/* battery body */}
          <rect x="0" y="6" width="100" height="40" rx="6" fill="#0f172a" stroke="#34d399" strokeWidth={2} strokeDasharray="5 3" />
          {/* battery terminal cap */}
          <rect x="100" y="18" width="6" height="16" rx="1" fill="#34d399" />
          {/* fill bars - 70% SOC indicator */}
          <rect x="6" y="12" width="20" height="28" rx="2" fill="#34d399" opacity={0.85} />
          <rect x="30" y="12" width="20" height="28" rx="2" fill="#34d399" opacity={0.7} />
          <rect x="54" y="12" width="20" height="28" rx="2" fill="#34d399" opacity={0.4} />
          <rect x="78" y="12" width="16" height="28" rx="2" fill="#34d399" opacity={0.15} />
          <text x="50" y="68" textAnchor="middle" className="fill-emerald-300" style={{ font: '600 13px ui-monospace, Menlo, monospace' }}>
            BATTERY
          </text>
          <text x="50" y="84" textAnchor="middle" className="fill-gray-400" style={{ font: '11px ui-sans-serif, system-ui' }}>
            optional · 1-2 kWh
          </text>
          <text x="50" y="-3" textAnchor="middle" className="fill-emerald-300/70" style={{ font: '10px ui-sans-serif, system-ui', fontStyle: 'italic' }}>
            stores excess for evening
          </text>
        </g>

        {/* Bidirectional dashed arrows: home <-> battery */}
        {/* Charge flow: home -> battery (downward) */}
        <line
          x1="555"
          y1="155"
          x2="450"
          y2="190"
          stroke="#34d399"
          strokeWidth={2}
          strokeDasharray="4 4"
          markerEnd="url(#arrowDashed)"
        />
        <text
          x="498"
          y="167"
          className="fill-emerald-300/80"
          style={{ font: '10px ui-monospace, Menlo, monospace' }}
        >
          charge
        </text>
        {/* Discharge flow: battery -> home (upward) */}
        <line
          x1="445"
          y1="200"
          x2="550"
          y2="165"
          stroke="#34d399"
          strokeWidth={2}
          strokeDasharray="4 4"
          markerEnd="url(#arrowDashed)"
          opacity={0.6}
        />
        <text
          x="468"
          y="217"
          className="fill-emerald-300/80"
          style={{ font: '10px ui-monospace, Menlo, monospace' }}
        >
          discharge later
        </text>

        {/* Grid (top-up) - bottom right */}
        <g transform="translate(595, 225)">
          <rect x="0" y="0" width="100" height="32" rx="6" fill="#0f172a" stroke="#94a3b8" strokeWidth={1.5} />
          <text x="50" y="14" textAnchor="middle" className="fill-gray-300" style={{ font: '600 11px ui-monospace, Menlo, monospace' }}>
            GRID
          </text>
          <text x="50" y="27" textAnchor="middle" className="fill-gray-500" style={{ font: '10px ui-sans-serif, system-ui' }}>
            tops up the rest
          </text>
        </g>
        {/* dashed line from grid up to home */}
        <line x1="645" y1="225" x2="615" y2="120" stroke="#94a3b8" strokeWidth={2} strokeDasharray="3 3" />
      </svg>

      <figcaption className="mt-2 text-center text-[11px] text-gray-400 font-mono">
        Sun → panel → inverter (clipped to 800 W AC) → 3-pin plug → home wiring. An optional
        battery stores excess for the evening; the grid invisibly tops up the rest.
      </figcaption>
    </figure>
  );
}
