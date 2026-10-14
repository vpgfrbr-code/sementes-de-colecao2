import { type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name?: string;
  className?: string;
  background?: ReactNode;
  children?: ReactNode;
  label?: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[minmax(6rem,auto)] grid-cols-3 gap-[1px] bg-foreground/15",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  children,
  label,
  ...props
}: BentoCardProps) => (
  <div
    className={cn(
      "group relative col-span-3 flex flex-col overflow-hidden bg-card",
      className
    )}
    {...props}
  >
    {/* Background media or texture */}
    {background && (
      <div className="absolute inset-0">{background}</div>
    )}

    {/* Top label */}
    {label && (
      <div className="relative z-10 flex w-full items-center justify-between px-5 py-2.5">
        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-foreground/40">
          {label}
        </span>
        {name && (
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-foreground/30">
            {name}
          </span>
        )}
      </div>
    )}

    {/* Content */}
    <div className="relative z-10 flex flex-1 flex-col">
      {children}
    </div>
  </div>
);

export { BentoCard, BentoGrid };
export type { BentoGridProps, BentoCardProps };
