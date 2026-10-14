"use client";

import { motion } from "motion/react";

interface SealStampProps {
  topText: string;
  bottomText?: string;
  centerContent: React.ReactNode;
  size?: number;
  rotation?: number;
  className?: string;
  textScale?: number;
}

export function SealStamp({
  topText,
  bottomText,
  centerContent,
  size = 72,
  rotation = -12,
  className = "",
  textScale = 1,
}: SealStampProps) {
  const r = size / 2;
  const textRadius = r - (size * 0.16);
  const innerRing = r - (size * 0.30);
  
  // Full circle paths so textPath never cuts off long text
  // Top text path: starts at bottom, goes clockwise through top, back to bottom. 50% is top-center.
  const topArc = `M ${r},${r + textRadius} a ${textRadius},${textRadius} 0 1,1 0,-${textRadius * 2} a ${textRadius},${textRadius} 0 1,1 0,${textRadius * 2}`;
  // Bottom text path: starts at top, goes counter-clockwise through bottom, back to top. 50% is bottom-center.
  const bottomArc = `M ${r},${r - textRadius} a ${textRadius},${textRadius} 0 1,0 0,${textRadius * 2} a ${textRadius},${textRadius} 0 1,0 0,-${textRadius * 2}`;

  return (
    <motion.div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.8, rotate: rotation }}
      whileInView={{ opacity: 1, scale: 1, rotate: rotation }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="text-foreground/80"
        fill="none"
      >
        {/* Outer ring */}
        <circle cx={r} cy={r} r={r - 2} stroke="currentColor" strokeWidth="1.5" />
        {/* Inner ring */}
        <circle cx={r} cy={r} r={innerRing} stroke="currentColor" strokeWidth="0.5" />

        {/* Top text path */}
        <defs>
          <path id={`seal-top-${size}`} d={topArc} />
          {bottomText && <path id={`seal-bottom-${size}`} d={bottomArc} />}
        </defs>
        <text
          className="fill-current"
          fontSize={(size * 0.125) * textScale}
          fontFamily="var(--font-mono)"
          fontWeight="bold"
          letterSpacing="0.08em"
          textAnchor="middle"
          dominantBaseline="central"
        >
          <textPath href={`#seal-top-${size}`} startOffset="50%">
            {topText.toUpperCase()}
          </textPath>
        </text>

        {/* Bottom text path */}
        {bottomText && (
          <text
            className="fill-current"
            fontSize={(size * 0.125) * textScale}
            fontFamily="var(--font-mono)"
            fontWeight="bold"
            letterSpacing="0.08em"
            textAnchor="middle"
            dominantBaseline="central"
          >
            <textPath href={`#seal-bottom-${size}`} startOffset="50%">
              {bottomText.toUpperCase()}
            </textPath>
          </text>
        )}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {centerContent}
      </div>
    </motion.div>
  );
}
