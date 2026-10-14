interface CropMarksProps {
  className?: string;
}

export function CropMarks({ className = "" }: CropMarksProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      {/* Corner L-marks */}
      <svg className="absolute -top-2.5 -left-2.5 h-5 w-5 text-foreground/30" viewBox="0 0 20 20" fill="none">
        <path d="M20 0 L0 0 L0 20" stroke="currentColor" strokeWidth="0.75" />
      </svg>
      <svg className="absolute -top-2.5 -right-2.5 h-5 w-5 text-foreground/30" viewBox="0 0 20 20" fill="none">
        <path d="M0 0 L20 0 L20 20" stroke="currentColor" strokeWidth="0.75" />
      </svg>
      <svg className="absolute -bottom-2.5 -left-2.5 h-5 w-5 text-foreground/30" viewBox="0 0 20 20" fill="none">
        <path d="M0 0 L0 20 L20 20" stroke="currentColor" strokeWidth="0.75" />
      </svg>
      <svg className="absolute -bottom-2.5 -right-2.5 h-5 w-5 text-foreground/30" viewBox="0 0 20 20" fill="none">
        <path d="M20 0 L20 20 L0 20" stroke="currentColor" strokeWidth="0.75" />
      </svg>

      {/* Center crosshair marks on edges */}
      <svg className="absolute top-1/2 -left-3 h-2 w-2 -translate-y-1/2 text-foreground/20" viewBox="0 0 8 8" fill="none">
        <line x1="0" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="0.5" />
        <line x1="4" y1="0" x2="4" y2="8" stroke="currentColor" strokeWidth="0.5" />
      </svg>
      <svg className="absolute top-1/2 -right-3 h-2 w-2 -translate-y-1/2 text-foreground/20" viewBox="0 0 8 8" fill="none">
        <line x1="0" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="0.5" />
        <line x1="4" y1="0" x2="4" y2="8" stroke="currentColor" strokeWidth="0.5" />
      </svg>
      <svg className="absolute -top-3 left-1/2 h-2 w-2 -translate-x-1/2 text-foreground/20" viewBox="0 0 8 8" fill="none">
        <line x1="0" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="0.5" />
        <line x1="4" y1="0" x2="4" y2="8" stroke="currentColor" strokeWidth="0.5" />
      </svg>
      <svg className="absolute -bottom-3 left-1/2 h-2 w-2 -translate-x-1/2 text-foreground/20" viewBox="0 0 8 8" fill="none">
        <line x1="0" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="0.5" />
        <line x1="4" y1="0" x2="4" y2="8" stroke="currentColor" strokeWidth="0.5" />
      </svg>

      {/* Crosshair circles at corners */}
      <svg className="absolute -top-4 -left-4 h-3 w-3 text-foreground/15" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="6" cy="6" r="1" fill="currentColor" />
      </svg>
      <svg className="absolute -top-4 -right-4 h-3 w-3 text-foreground/15" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="6" cy="6" r="1" fill="currentColor" />
      </svg>
      <svg className="absolute -bottom-4 -left-4 h-3 w-3 text-foreground/15" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="6" cy="6" r="1" fill="currentColor" />
      </svg>
      <svg className="absolute -bottom-4 -right-4 h-3 w-3 text-foreground/15" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="6" cy="6" r="1" fill="currentColor" />
      </svg>
    </div>
  );
}
