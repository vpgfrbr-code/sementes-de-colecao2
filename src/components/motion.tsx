"use client";

import { motion, type Variants } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";

/* ============================================
   Motion Primitives for SementesDeColecao.com
   
   Principle: Elements emerge like seeds growing —
   upward, gentle, with natural ease.
   ============================================ */

// --- Shared easing ---
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

// --- Variant presets ---
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: EASE_OUT_QUART },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: EASE_OUT_EXPO },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE_OUT_EXPO },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE_OUT_EXPO },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// --- Component: Fade Up on scroll ---
type MotionDivProps = ComponentPropsWithoutRef<typeof motion.div>;

export function FadeUp({
  children,
  className,
  delay = 0,
  ...props
}: MotionDivProps & { delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: EASE_OUT_EXPO, delay },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// --- Component: Scale in on scroll ---
export function ScaleIn({
  children,
  className,
  delay = 0,
  ...props
}: MotionDivProps & { delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: { opacity: 0, scale: 0.93 },
        visible: {
          opacity: 1,
          scale: 1,
          transition: { duration: 0.55, ease: EASE_OUT_EXPO, delay },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// --- Component: Stagger children on scroll ---
export function StaggerGroup({
  children,
  className,
  staggerDelay = 0.08,
  ...props
}: MotionDivProps & { staggerDelay?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: staggerDelay, delayChildren: 0.1 },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// --- Component: Child item for StaggerGroup ---
export function StaggerItem({
  children,
  className,
  ...props
}: MotionDivProps) {
  return (
    <motion.div variants={fadeUp} className={className} {...props}>
      {children}
    </motion.div>
  );
}

// --- Component: Image reveal (clip-path wipe) ---
export function ImageReveal({
  children,
  className,
  direction = "up",
  ...props
}: MotionDivProps & { direction?: "up" | "left" | "right" }) {
  const clipPaths = {
    up: { hidden: "inset(100% 0 0 0)", visible: "inset(0 0 0 0)" },
    left: { hidden: "inset(0 100% 0 0)", visible: "inset(0 0 0 0)" },
    right: { hidden: "inset(0 0 0 100%)", visible: "inset(0 0 0 0)" },
  };

  return (
    <motion.div
      initial={{ clipPath: clipPaths[direction].hidden, opacity: 0 }}
      whileInView={{
        clipPath: clipPaths[direction].visible,
        opacity: 1,
        transition: { duration: 0.8, ease: EASE_OUT_EXPO },
      }}
      viewport={{ once: true, margin: "-60px" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// --- Component: Hover lift (for cards) ---
export function HoverLift({
  children,
  className,
  ...props
}: MotionDivProps) {
  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.3, ease: EASE_OUT_QUART } }}
      whileTap={{ scale: 0.98 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
