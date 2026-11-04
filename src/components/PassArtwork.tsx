/** Two folded sheets lie behind the credential. Light follows their creases. */
type ArtworkProps = { theme: string };

export default function PassBackdrop({ theme }: ArtworkProps) {
  if (theme === "gold") {
    return (
      <svg className="pass-backdrop" aria-hidden="true" focusable="false" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="foil-ink" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#534329" /><stop offset=".3" stopColor="#99784b" />
            <stop offset=".6" stopColor="#57462e" /><stop offset="1" stopColor="#b79869" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#foil-ink)" opacity=".48">
          {Array.from({ length: 32 }, (_, i) => (
            <path key={i} d={`M ${-380 + i * 24} 950 Q ${-160 + i * 27} ${285 + i * 9}, ${475 + i * 43} -100`} />
          ))}
        </g>
        <g fill="none" stroke="#ab8d60" opacity=".24">
          {Array.from({ length: 22 }, (_, i) => (
            <path key={i} d={`M ${800 + i * 21} 1000 Q ${1180 + i * 6} ${520 + i * 11}, 1530 ${170 + i * 24}`} />
          ))}
        </g>
      </svg>
    );
  }

  if (theme === "slate") {
    return (
      <svg className="pass-backdrop" aria-hidden="true" focusable="false" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="emboss-edge" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#111113"/><stop offset=".45" stopColor="#535357"/><stop offset="1" stopColor="#222224"/>
          </linearGradient>
        </defs>
        <g fill="none" transform="rotate(-37 720 450)">
          {[0, 1, 2, 3, 4].map(i => (
            <g key={i}>
              <rect x={-550 + i * 85} y={-480 + i * 83} rx={170 - i * 18} width="2060" height="1100" stroke="#0a0a0c" strokeWidth="7"/>
              <rect x={-550 + i * 85} y={-478 + i * 83} rx={170 - i * 18} width="2060" height="1100" stroke="url(#emboss-edge)" strokeWidth="3"/>
            </g>
          ))}
        </g>
      </svg>
    );
  }

  return (
    <svg className="pass-backdrop" aria-hidden="true" focusable="false" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sheet-face" x1="0%" y1="75%" x2="100%" y2="12%">
          <stop stopColor="var(--sheet-pale)" />
          <stop offset=".32" stopColor="var(--sheet-mid)" />
          <stop offset=".55" stopColor="var(--sheet-pale)" />
          <stop offset=".85" stopColor="var(--sheet-mid)" />
          <stop offset="1" stopColor="var(--sheet-edge)" />
        </linearGradient>
        <linearGradient id="sheet-return" x1="25%" y1="100%" x2="72%" y2="5%">
          <stop stopColor="var(--sheet-edge)" />
          <stop offset=".5" stopColor="var(--sheet-mid)" />
          <stop offset="1" stopColor="var(--sheet-back)" />
        </linearGradient>
        <linearGradient id="sheet-lower" x1="0%" y1="0%" x2="92%" y2="85%">
          <stop stopColor="var(--sheet-pale)" />
          <stop offset=".4" stopColor="var(--sheet-edge)" />
          <stop offset=".68" stopColor="var(--sheet-pale)" />
          <stop offset="1" stopColor="var(--sheet-mid)" />
        </linearGradient>
      </defs>
      <path d="M-140 371C150 426 202 721 445 712C610 707 716 527 855 397C1051 213 1202 152 1511 111L1500 243C1252 255 1101 333 935 480C772 624 679 821 470 834C204 852 108 647-140 605Z" fill="url(#sheet-face)" />
      <path d="M-140 605C108 647 204 852 470 834C659 822 757 659 897 517C755 696 657 891 465 894C173 898 71 687-140 619Z" fill="url(#sheet-return)" />
      <path d="M-140 371C150 426 202 721 445 712C610 707 716 527 855 397C1051 213 1202 152 1511 111" fill="none" stroke="var(--sheet-highlight)" strokeWidth="2" />
      <path d="M905 956C969 822 1067 770 1150 649C1252 501 1214 335 1516 290L1514 395C1320 448 1343 570 1245 710C1152 844 1095 877 1064 956Z" fill="url(#sheet-lower)" />
      <path d="M905 956C969 822 1067 770 1150 649C1252 501 1214 335 1516 290" fill="none" stroke="var(--sheet-highlight)" strokeWidth="1.6" />
    </svg>
  );
}

/** A folded band and engraved parallel contours give the printed pass its own face. */
export function PassRibbon({ theme }: ArtworkProps) {
  if (theme === "gold") {
    return (
      <svg className="pass-ribbon" aria-hidden="true" focusable="false" viewBox="0 0 440 130" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pass-gilding">
            <stop stopColor="#786244"/><stop offset=".33" stopColor="#cfb58b"/><stop offset=".67" stopColor="#92723e"/><stop offset="1" stopColor="#e4d2b1"/>
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#pass-gilding)" strokeWidth=".85">
          {Array.from({ length: 32 }, (_, i) => (
            <path key={i} d={`M ${160 + i * 5} 152 Q ${195 + i * 6.5} ${52 + i * 1.1}, ${249 + i * 11} -23`} />
          ))}
        </g>
        <path d="M7 122V8h426v114" fill="none" stroke="#c3a577" strokeWidth=".65" opacity=".7" />
      </svg>
    );
  }

  if (theme === "slate") {
    return (
      <svg className="pass-ribbon" aria-hidden="true" focusable="false" viewBox="0 0 440 130" preserveAspectRatio="none">
        <g transform="rotate(-37 334 55)" fill="none">
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i}>
              <rect x={190 + i * 15} y={-55 + i * 6} width="280" height="188" rx="26" stroke="#101011" strokeWidth="2.7" />
              <rect x={190 + i * 15} y={-54 + i * 6} width="280" height="188" rx="26" stroke="#646464" opacity=".65" strokeWidth=".9" />
            </g>
          ))}
        </g>
      </svg>
    );
  }

  if (theme === "default") {
    return (
      <svg className="pass-ribbon" aria-hidden="true" focusable="false" viewBox="0 0 440 130" preserveAspectRatio="none">
        <defs>
          <pattern id="woven-paper" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M0 1h4M2 2v2" stroke="#827f78" strokeWidth=".3" opacity=".45" />
          </pattern>
        </defs>
        <rect width="440" height="130" fill="url(#woven-paper)" />
        <g fill="none" stroke="#9e9d95" opacity=".5" strokeWidth=".8">
          {Array.from({ length: 14 }, (_, i) => <ellipse key={i} cx="429" cy="-5" rx={100 + i * 6} ry={53 + i * 6} transform="rotate(-26 429 -5)" />)}
        </g>
      </svg>
    );
  }

  return (
    <svg className="pass-ribbon" aria-hidden="true" focusable="false" viewBox="0 0 440 130" preserveAspectRatio="none">
      <defs>
        <linearGradient id="pass-fold" x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="var(--print-light)" stopOpacity=".2" />
          <stop offset=".48" stopColor="var(--print-light)" stopOpacity=".9" />
          <stop offset="1" stopColor="var(--print-light)" stopOpacity=".25" />
        </linearGradient>
      </defs>
      <path d="M144 154C249 134 272 68 308 18C340-30 401-43 467-40V-2C389-5 360 26 337 68C317 105 291 135 265 154Z" fill="url(#pass-fold)" />
      <path d="M254 150C292 123 318 88 340 40C358 3 398-22 458-24" opacity=".32" fill="none" stroke="var(--print-highlight)" />
      <g fill="none" stroke="var(--print-highlight)" strokeWidth=".9" opacity=".39">
        {Array.from({ length: 18 }, (_, i) =>
          <path key={i} d={`M${137 + i * 7} 145C${237 + i * 7} 106 ${256 + i * 5} ${64 + i} ${284 + i * 4.5} 17S${359 + i * 4} -34 460 -39`} />
        )}
      </g>
      <path d="M286 146C342 123 352 63 393 42C410 32 431 29 454 30V77C418 81 408 105 389 146Z" fill="var(--print-light)" opacity=".32" />
    </svg>
  );
}
