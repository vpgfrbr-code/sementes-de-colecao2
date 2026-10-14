"use client";

import { TextAnimate } from "@/components/ui/text-animate";
import type { ComponentProps } from "react";

type TextAnimateProps = ComponentProps<typeof TextAnimate>;

interface AnimatedHeadingProps {
  children: string;
  as?: TextAnimateProps["as"];
  animation?: TextAnimateProps["animation"];
  by?: TextAnimateProps["by"];
  delay?: number;
  className?: string;
  segmentClassName?: string;
}

export function AnimatedHeading({
  children,
  as = "h2",
  animation = "blurInUp",
  by = "word",
  delay,
  className,
  segmentClassName,
}: AnimatedHeadingProps) {
  return (
    <TextAnimate
      as={as}
      animation={animation}
      by={by}
      delay={delay}
      once
      className={className}
      segmentClassName={segmentClassName}
    >
      {children}
    </TextAnimate>
  );
}
