"use client";

import { LineShadowText } from "@/components/ui/line-shadow-text";
import { useTheme } from "next-themes";
import type { ComponentProps } from "react";

type LineShadowProps = ComponentProps<typeof LineShadowText>;

interface LineShadowHeadingProps {
  children: string;
  as?: LineShadowProps["as"];
  className?: string;
}

export function LineShadowHeading({
  children,
  as = "span",
  className,
}: LineShadowHeadingProps) {
  const { resolvedTheme } = useTheme();
  const shadowColor = resolvedTheme === "dark" ? "hsl(var(--foreground))" : "hsl(var(--primary))";

  return (
    <LineShadowText
      as={as}
      shadowColor={shadowColor}
      className={className}
    >
      {children}
    </LineShadowText>
  );
}
