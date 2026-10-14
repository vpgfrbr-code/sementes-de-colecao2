import { cn } from "@/lib/utils"

interface DotPatternProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number
  height?: number
  cr?: number
  className?: string
  glow?: boolean
  // Keep legacy props in the interface for backwards compat (ignored)
  x?: number
  y?: number
  cx?: number
  cy?: number
}

/**
 * DotPattern — lightweight CSS-only version.
 *
 * Uses a `radial-gradient` background instead of individual SVG circles.
 * Single DOM element regardless of container size. The `glow` prop adds
 * a subtle CSS pulse animation on the whole pattern.
 */
export function DotPattern({
  width = 16,
  height = 16,
  cr = 1,
  className,
  glow = false,
  // Destructure legacy props so they don't spread onto the div
  x: _x,
  y: _y,
  cx: _cx,
  cy: _cy,
  ...props
}: DotPatternProps) {
  const dotDiameter = cr * 2

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full text-neutral-400/80",
        glow && "animate-dot-glow",
        className
      )}
      style={{
        backgroundImage: `radial-gradient(circle, currentColor ${dotDiameter}px, transparent ${dotDiameter}px)`,
        backgroundSize: `${width}px ${height}px`,
      }}
      {...props}
    />
  )
}
