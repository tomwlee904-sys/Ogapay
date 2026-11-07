import { MARK_PATHS, MARK_VIEWBOX } from './logoMark'

// The OgaPay mark (brand kit v1, 2026-11-07), in the text colour
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox={MARK_VIEWBOX} fill="none" style={{ display: 'block' }} aria-hidden="true">
      {MARK_PATHS.map(([d, t], i) => <path key={i} d={d} transform={t} fill="currentColor" />)}
    </svg>
  );
}
