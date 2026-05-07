/**
 * Inline SVG diagram showing the four-stage flow of a plug-in solar
 * system: Sun → Panel → Combined micro-inverter + (optional) battery
 * unit → Home, with the grid invisibly topping up whatever the panel
 * isn't producing.
 *
 * The combined inverter/battery unit reflects how mainstream UK kits
 * actually ship today (EcoFlow STREAM, Anker SOLIX Solarbank, Zendure
 * SolarFlow): the storage is built into the same housing as the
 * micro-inverter rather than being a separate component the user has
 * to wire up. Battery-only versions skip the panel entirely.
 *
 * All inline so it ships in the SSR HTML and works for AI / search
 * snapshots without loading any images.
 */
export function HowItWorksDiagram() {
  return (
    <figure
      aria-label="Plug-in solar flow diagram"
      className="my-2 rounded-2xl border border-[#D2E369]/30 bg-gradient-to-br from-sky-950/40 via-gray-950/60 to-emerald-950/30 p-4 md:p-6"
    >
      <svg
        viewBox="0 0 720 240"
        role="img"
        aria-labelledby="howItWorksTitle howItWorksDesc"
        className="w-full h-auto"
      >
        <title id="howItWorksTitle">How plug-in solar works</title>
        <desc id="howItWorksDesc">
          Sunlight hits a solar panel which feeds DC power into a combined micro-inverter and
          optional battery unit. The inverter converts the DC into 230 V AC and pushes it through
          a standard three-pin plug into the home wiring. The optional battery stores any excess
          for use later. The grid invisibly tops up whatever isn't being supplied.
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
        </defs>

        {/* Sun */}
        <g>
          <circle cx="60" cy="80" r="28" fill="url(#sunGrad)" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const r1 = 36;
            const r2 = 48;
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={60 + Math.cos(rad) * r1}
                y1={80 + Math.sin(rad) * r1}
                x2={60 + Math.cos(rad) * r2}
                y2={80 + Math.sin(rad) * r2}
                stroke="#FFD43B"
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
          <text x="60" y="150" textAnchor="middle" className="fill-[#FFE066]" style={{ font: '600 14px ui-monospace, Menlo, monospace' }}>
            SUN
          </text>
          <text x="60" y="168" textAnchor="middle" className="fill-gray-400" style={{ font: '11px ui-sans-serif, system-ui' }}>
            free fuel
          </text>
        </g>

        {/* Arrow 1: Sun → Panel */}
        <line x1="110" y1="80" x2="170" y2="80" stroke="#D2E369" strokeWidth={3} strokeDasharray="4 4" markerEnd="url(#arrow)" />

        {/* Panel */}
        <g transform="translate(180, 40)">
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

        {/* Arrow 2: Panel → Combined inverter+battery */}
        <line x1="305" y1="80" x2="365" y2="80" stroke="#D2E369" strokeWidth={3} strokeDasharray="4 4" markerEnd="url(#arrow)" />

        {/* Combined Inverter + (optional) Battery unit */}
        <g transform="translate(375, 30)">
          {/* outer housing */}
          <rect x="0" y="0" width="115" height="115" rx="10" fill="#0f172a" stroke="#D2E369" strokeWidth={2} />

          {/* top zone: inverter */}
          <rect x="6" y="6" width="103" height="38" rx="5" fill="#1f2937" stroke="#D2E369" strokeWidth={1} />
          <text x="57.5" y="22" textAnchor="middle" className="fill-[#D2E369]" style={{ font: '700 11px ui-monospace, Menlo, monospace' }}>
            DC → AC INVERTER
          </text>
          <text x="57.5" y="36" textAnchor="middle" className="fill-gray-400" style={{ font: '10px ui-sans-serif, system-ui' }}>
            800 W max output
          </text>

          {/* divider with "+" */}
          <line x1="6" y1="51" x2="109" y2="51" stroke="#D2E369" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="3 2" />
          <circle cx="57.5" cy="51" r="6" fill="#0f172a" stroke="#D2E369" strokeWidth={1} />
          <text x="57.5" y="54" textAnchor="middle" className="fill-[#D2E369]" style={{ font: '700 9px ui-monospace, Menlo, monospace' }}>
            +
          </text>

          {/* bottom zone: optional battery */}
          <rect
            x="6"
            y="58"
            width="103"
            height="32"
            rx="5"
            fill="#0f172a"
            stroke="#34d399"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text x="57.5" y="73" textAnchor="middle" className="fill-emerald-300" style={{ font: '700 11px ui-monospace, Menlo, monospace' }}>
            BATTERY
          </text>
          <text x="57.5" y="86" textAnchor="middle" className="fill-emerald-300/70" style={{ font: '10px ui-sans-serif, system-ui', fontStyle: 'italic' }}>
            optional · 1-2 kWh
          </text>

          {/* battery fill bars - 70% SOC visual hint */}
          <rect x="11" y="62" width="4" height="22" rx="1" fill="#34d399" opacity={0.85} />
          <rect x="17" y="62" width="4" height="22" rx="1" fill="#34d399" opacity={0.7} />
          <rect x="23" y="62" width="4" height="22" rx="1" fill="#34d399" opacity={0.5} />
          <rect x="29" y="62" width="4" height="22" rx="1" fill="#34d399" opacity={0.2} />

          {/* plug pins underneath the housing */}
          <rect x="32" y="98" width="6" height="14" rx="1" fill="#9ca3af" />
          <rect x="55" y="98" width="6" height="14" rx="1" fill="#9ca3af" />
          <rect x="78" y="98" width="6" height="14" rx="1" fill="#9ca3af" />

          <text x="57.5" y="135" textAnchor="middle" className="fill-[#D2E369]" style={{ font: '600 12px ui-monospace, Menlo, monospace' }}>
            INVERTER + BATTERY
          </text>
          <text x="57.5" y="150" textAnchor="middle" className="fill-gray-400" style={{ font: '10px ui-sans-serif, system-ui' }}>
            single 13 A plug
          </text>
        </g>

        {/* Arrow 3: Unit → Home */}
        <line x1="495" y1="80" x2="555" y2="80" stroke="#D2E369" strokeWidth={3} strokeDasharray="4 4" markerEnd="url(#arrow)" />

        {/* Home */}
        <g transform="translate(560, 28)">
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

        {/* Grid (top-up) - bottom right */}
        <g transform="translate(610, 188)">
          <rect x="0" y="0" width="100" height="32" rx="6" fill="#0f172a" stroke="#94a3b8" strokeWidth={1.5} />
          <text x="50" y="14" textAnchor="middle" className="fill-gray-300" style={{ font: '600 11px ui-monospace, Menlo, monospace' }}>
            GRID
          </text>
          <text x="50" y="27" textAnchor="middle" className="fill-gray-500" style={{ font: '10px ui-sans-serif, system-ui' }}>
            tops up the rest
          </text>
        </g>
        {/* dashed line from grid up to home */}
        <line x1="660" y1="188" x2="630" y2="125" stroke="#94a3b8" strokeWidth={2} strokeDasharray="3 3" />
      </svg>

      <figcaption className="mt-3 space-y-1.5">
        <p className="text-center text-[11px] text-gray-400 font-mono leading-snug">
          Most UK kits combine the inverter and (optional) battery into one box that plugs into a
          single 13 A socket. The grid invisibly tops up whatever isn't being supplied.
        </p>
        <p className="text-center text-[11px] text-emerald-300/80 font-mono leading-snug">
          ⚡ A battery-only version skips the panel entirely — useful for time-shifting
          cheap overnight electricity (e.g. on Octopus Flux) into peak hours.
        </p>
      </figcaption>
    </figure>
  );
}
