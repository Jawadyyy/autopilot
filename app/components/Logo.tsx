import type { SVGProps } from 'react'

// Unique brand mark: a database cylinder with an autopilot pulse running
// through it — "self-monitoring, self-healing database" in one glyph.
export function LogoMark({ size = 36, className, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
  const id = 'logo-grad'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b78ff" />
          <stop offset="1" stopColor="#1f54e0" />
        </linearGradient>
      </defs>

      {/* Badge */}
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />

      {/* Database cylinder */}
      <g stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.95">
        <ellipse cx="20" cy="13" rx="9" ry="3.4" />
        <path d="M11 13v14c0 1.88 4.03 3.4 9 3.4s9-1.52 9-3.4V13" />
      </g>

      {/* Autopilot pulse across the core */}
      <path
        d="M9 21h4.4l2.3-4.2 3.4 8 2.4-5 1.7 2.6H31"
        stroke="#bfe0ff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export function Logo({ size = 36, showWord = true }: { size?: number; showWord?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} className="shrink-0 shadow-sm rounded-[11px]" />
      {showWord && (
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight text-slate-900">DB Autopilot</span>
        </span>
      )}
    </span>
  )
}
