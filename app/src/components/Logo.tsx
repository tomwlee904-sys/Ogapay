export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1440 1440" fill="none" style={{ display: 'block' }}>
      <rect x="170" y="270" width="320" height="250" rx="48" fill="currentColor"/>
      <rect x="585" y="270" width="320" height="250" rx="48" fill="currentColor"/>
      <path d="M1000 270 H1190 C1255 270 1300 320 1300 390 C1300 460 1255 520 1190 520 H1000 V270 Z" fill="currentColor"/>
      <rect x="170" y="585" width="320" height="250" fill="currentColor"/>
      <rect x="585" y="585" width="320" height="250" fill="currentColor"/>
      <path d="M1000 585 H1190 C1255 585 1300 635 1300 705 C1300 775 1255 835 1190 835 H1000 V585 Z" fill="currentColor"/>
      <rect x="170" y="900" width="320" height="250" rx="48" fill="currentColor"/>
      <rect x="585" y="900" width="320" height="250" rx="48" fill="currentColor"/>
    </svg>
  );
}
