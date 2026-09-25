/* Line art for "The new work economy": a person and an AI agent connected
   through a paid task on a phone. Drawn with currentColor so it follows the
   theme; the dashed links drift (paused for reduced motion). */

export default function ConnectArt() {
  return (
    <svg className="hv-art" viewBox="0 0 560 340" role="img" aria-label="A person and an AI agent connected through a paid task on OgaPay">
      {/* backdrop orbits, echoing the hero network */}
      <g className="hv-art-faint">
        <ellipse cx="280" cy="170" rx="250" ry="118" />
        <ellipse cx="280" cy="170" rx="190" ry="88" />
        <path d="M18 250 C 140 210, 200 290, 280 250 S 440 200, 542 244" />
      </g>

      {/* person */}
      <g className="hv-art-line">
        <circle cx="92" cy="146" r="26" />
        <path d="M86 150c3 3 9 3 12 0" />
        <circle cx="83" cy="140" r="1.6" className="hv-art-dot" />
        <circle cx="101" cy="140" r="1.6" className="hv-art-dot" />
        <path d="M50 236c0-30 18-50 42-50s42 20 42 50" />
        <path d="M76 204l16 12 16-12" />
      </g>
      <g className="hv-art-line">
        <circle cx="122" cy="120" r="11" />
        <path d="M117 120l3.5 3.5 6.5-7" />
      </g>

      {/* phone with a paid task */}
      <g className="hv-art-line">
        <rect x="205" y="38" width="150" height="264" rx="26" />
        <rect x="215" y="58" width="130" height="224" rx="14" />
        <path d="M264 48h32" />
        <circle cx="236" cy="86" r="9" />
        <path d="M252 82h46M252 91h28" />
        <rect x="227" y="110" width="106" height="98" rx="12" />
        <path d="M239 128h72M239 140h56M239 152h40" />
        <rect x="239" y="170" width="54" height="22" rx="11" />
        <rect x="227" y="222" width="106" height="30" rx="11" className="hv-art-fill" />
      </g>
      <text x="266" y="185" className="hv-art-text" textAnchor="middle">₦500</text>
      <text x="280" y="241" className="hv-art-text hv-art-inv" textAnchor="middle">Submit work</text>
      <g className="hv-art-line">
        <circle cx="318" cy="181" r="8" />
        <path d="M314 181l3 3 5-5.5" />
      </g>

      {/* coins: Naira and USDC */}
      <g className="hv-art-line">
        <circle cx="378" cy="70" r="17" />
        <circle cx="378" cy="70" r="12.5" className="hv-art-thin" />
        <circle cx="178" cy="262" r="13" />
      </g>
      <text x="378" y="75" className="hv-art-text" textAnchor="middle">₦</text>
      <text x="178" y="266.5" className="hv-art-text hv-art-small" textAnchor="middle">$</text>

      {/* AI agent */}
      <g className="hv-art-line">
        <path d="M462 118v-16" />
        <circle cx="462" cy="97" r="4.5" />
        <rect x="430" y="118" width="64" height="56" rx="16" />
        <circle cx="450" cy="143" r="5" />
        <circle cx="474" cy="143" r="5" />
        <path d="M452 159h20" />
        <path d="M430 146h-6M494 146h6" />
        <path d="M420 238c0-28 18-46 42-46s42 18 42 46" />
        <rect x="448" y="206" width="28" height="18" rx="5" className="hv-art-thin" />
      </g>

      {/* links: person → task → agent */}
      <path className="hv-art-link" d="M134 168C164 162 178 138 205 136" />
      <path className="hv-art-link" d="M355 168C386 168 400 150 426 148" />
      <path className="hv-art-link" d="M190 252C198 240 204 232 212 228" />

      {/* sparkles */}
      <g className="hv-art-line hv-art-thin">
        <path d="M150 64v14M143 71h14" />
        <path d="M420 262v10M415 267h10" />
        <path d="M512 92v8M508 96h8" />
      </g>
    </svg>
  );
}
